<?php
require_once __DIR__ . '/../api/headers.php';

require_once '../config/connection.php';
require_once '../models/Student.php';
require_once '../models/Subject.php';
require_once '../models/Teacher.php';
require_once '../models/Grade.php';

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit;
}

$file = $_FILES['file'];

// Validate file type
$allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'text/plain'];
$fileType = $file['type'];

if (!in_array($fileType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Please upload CSV or Excel files.']);
    exit;
}

// Create uploads directory if it doesn't exist
$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create uploads directory']);
        exit;
    }
}

// Generate unique filename
$fileName = uniqid() . '_' . $file['name'];
$filePath = $uploadDir . $fileName;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save uploaded file. Check directory permissions.']);
    exit;
}

try {
    $data = parseGradeData($filePath);
    $result = processGradeData($data, $conn);
    
    // Clean up uploaded file
    unlink($filePath);
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully imported {$result['count']} grade records",
        'count' => $result['count'],
        'students_created' => $result['students_created'],
        'subjects_created' => $result['subjects_created'],
        'teachers_created' => $result['teachers_created'],
        'errors' => $result['errors'] ?? []
    ]);
    
} catch (Exception $e) {
    // Clean up uploaded file
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function parseGradeData($filePath) {
    $data = [];
    $handle = fopen($filePath, 'r');
    
    if ($handle) {
        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) >= 15) { // Ensure we have enough columns
                $data[] = [
                    'academic_year' => trim($line[0]),
                    'college' => trim($line[1]),
                    'program' => trim($line[2]),
                    'student_id' => trim($line[3]),
                    'student_name' => trim($line[4]),
                    'middle_name' => trim($line[5]),
                    'year_semester' => trim($line[6]),
                    'subject_code' => trim($line[7]),
                    'subject_name' => trim($line[8]),
                    'subject_type' => trim($line[9]),
                    'units' => (int)trim($line[10]),
                    'section' => trim($line[11]),
                    'teacher_name' => trim($line[12]),
                    'schedule' => trim($line[13]),
                    'student_type' => trim($line[14]),
                    'enrollment_type' => trim($line[15]),
                    'gender' => trim($line[16]),
                    'grade' => trim($line[17]),
                    'remarks' => trim($line[18]),
                    'other1' => trim($line[19]),
                    'other2' => trim($line[20])
                ];
            }
        }
        fclose($handle);
    }
    
    return $data;
}

function processGradeData($data, $conn) {
    $count = 0;
    $studentsCreated = 0;
    $subjectsCreated = 0;
    $teachersCreated = 0;
    $errors = [];
    
    $student = new StudentModel($conn);
    $subject = new Subject($conn);
    $teacher = new TeacherModel($conn);
    $grade = new GradeModel($conn);
    
    // Track existing records to avoid duplicates
    $existingStudents = [];
    $existingSubjects = [];
    $existingTeachers = [];
    $teacherIdMap = []; // Map teacher names to their IDs
    
    foreach ($data as $row) {
        try {
            // Process student
            $studentId = $row['student_id'];
            if (!isset($existingStudents[$studentId])) {
                $studentName = explode(' ', $row['student_name'], 2);
                $firstName = $studentName[0] ?? '';
                $lastName = $studentName[1] ?? '';
                
                $studentData = [
                    'student_id' => $studentId,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => strtolower(str_replace(' ', '.', $row['student_name'])) . '@school.edu',
                    'program' => $row['program'],
                    'year_level' => extractYearLevel($row['year_semester']),
                    'status' => 'active',
                    'gpa' => null,
                    'at_risk' => 0,
                    'notes' => null,
                    'grade_level' => extractGradeLevel($row['year_semester'])
                ];
                
                try {
                    $student->create($studentData);
                    $studentsCreated++;
                } catch (Exception $e) {
                    // Student might already exist, continue
                }
                
                $existingStudents[$studentId] = true;
            }
            
            // Process teacher
            $teacherName = $row['teacher_name'];
            if (!isset($existingTeachers[$teacherName])) {
                $teacherNameParts = explode(' ', $teacherName, 2);
                $teacherFirstName = $teacherNameParts[0] ?? '';
                $teacherLastName = $teacherNameParts[1] ?? '';
                
                $teacherData = [
                    'first_name' => $teacherFirstName,
                    'last_name' => $teacherLastName,
                    'email' => strtolower(str_replace(' ', '.', $teacherName)) . '@school.edu',
                    'department' => 'Information Technology',
                    'p1_failed' => 0,
                    'p1_percent' => 0.00,
                    'p1_category' => 'GREEN (0.01%-10%)',
                    'p2_failed' => 0,
                    'p2_percent' => 0.00,
                    'p2_category' => 'GREEN (0.01%-10%)',
                    'p3_failed' => 0,
                    'p3_percent' => 0.00,
                    'p3_category' => 'GREEN (0.01%-10%)'
                ];
                
                try {
                    $teacherId = $teacher->create($teacherData);
                    $teachersCreated++;
                    $teacherIdMap[$teacherName] = $teacherId;
                } catch (Exception $e) {
                    // Teacher might already exist, try to find existing teacher
                    $stmt = $conn->prepare('SELECT id FROM teachers WHERE first_name = ? AND last_name = ?');
                    $stmt->execute([$teacherFirstName, $teacherLastName]);
                    $existingTeacher = $stmt->fetch();
                    if ($existingTeacher) {
                        $teacherIdMap[$teacherName] = $existingTeacher['id'];
                    }
                }
                
                $existingTeachers[$teacherName] = true;
            }
            
            // Process subject
            $subjectCode = $row['subject_code'];
            if (!isset($existingSubjects[$subjectCode])) {
                $subjectData = [
                    'subject_code' => $subjectCode,
                    'subject_name' => $row['subject_name'],
                    'description' => $row['subject_name'],
                    'units' => $row['units'],
                    'year_level' => extractGradeLevel($row['year_semester']),
                    'semester' => $row['year_semester'],
                    'program_name' => $row['program'],
                    'cutoff_grade' => 60.0
                ];
                
                try {
                    $subject->create($subjectData);
                    $subjectsCreated++;
                } catch (Exception $e) {
                    // Subject might already exist, continue
                }
                
                $existingSubjects[$subjectCode] = true;
            }
            
            // Process grade
            $gradeValue = $row['grade'];
            if ($gradeValue !== 'NA' && $gradeValue !== '-' && !empty($gradeValue)) {
                // Get the actual student and subject IDs
                $stmt = $conn->prepare('SELECT id FROM students WHERE student_id = ?');
                $stmt->execute([$studentId]);
                $studentRecord = $stmt->fetch();
                
                $stmt = $conn->prepare('SELECT id FROM subjects WHERE subject_code = ?');
                $stmt->execute([$subjectCode]);
                $subjectRecord = $stmt->fetch();
                
                if ($studentRecord && $subjectRecord && isset($teacherIdMap[$teacherName])) {
                    $gradeData = [
                        'student_id' => $studentRecord['id'],
                        'subject_id' => $subjectRecord['id'],
                        'teacher_id' => $teacherIdMap[$teacherName],
                        'academic_year' => $row['academic_year'],
                        'semester' => $row['year_semester'],
                        'midterm_grade' => null,
                        'final_grade' => (float)$gradeValue,
                        'final_rating' => (float)$gradeValue,
                        'status' => (float)$gradeValue >= 60 ? 'Passed' : 'Failed'
                    ];
                    
                    try {
                        $grade->create($gradeData);
                        $count++;
                    } catch (Exception $e) {
                        $errors[] = "Grade for {$studentId} in {$subjectCode}: " . $e->getMessage();
                    }
                } else {
                    $errors[] = "Missing student, subject, or teacher record for {$studentId} in {$subjectCode}";
                }
            }
            
        } catch (Exception $e) {
            $errors[] = "Row " . ($count + 1) . ": " . $e->getMessage();
        }
    }
    
    // Update teacher failure statistics
    $teachersUpdated = 0;
    foreach ($teacherIdMap as $teacherName => $teacherId) {
        try {
            if ($teacher->updateFailureStats($teacherId)) {
                $teachersUpdated++;
            }
        } catch (Exception $e) {
            $errors[] = "Failed to update failure stats for teacher {$teacherName}: " . $e->getMessage();
        }
    }
    
    return [
        'count' => $count,
        'students_created' => $studentsCreated,
        'subjects_created' => $subjectsCreated,
        'teachers_created' => $teachersCreated,
        'teachers_updated' => $teachersUpdated,
        'errors' => $errors
    ];
}

function extractYearLevel($yearSemester) {
    if (strpos($yearSemester, 'Y1') !== false) return '1st Year';
    if (strpos($yearSemester, 'Y2') !== false) return '2nd Year';
    if (strpos($yearSemester, 'Y3') !== false) return '3rd Year';
    if (strpos($yearSemester, 'Y4') !== false) return '4th Year';
    return '1st Year';
}

function extractGradeLevel($yearSemester) {
    if (strpos($yearSemester, 'Y1') !== false) return 1;
    if (strpos($yearSemester, 'Y2') !== false) return 2;
    if (strpos($yearSemester, 'Y3') !== false) return 3;
    if (strpos($yearSemester, 'Y4') !== false) return 4;
    return 1;
}
?>




