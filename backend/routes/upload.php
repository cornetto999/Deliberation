<?php
require_once __DIR__ . '/../load_env.php';
require_once __DIR__ . '/../api/headers.php';
require_once __DIR__ . '/../config/connection.php';
require_once __DIR__ . '/../models/Student.php';
require_once __DIR__ . '/../models/Teacher.php';
require_once __DIR__ . '/../models/Subject.php';

function detectDelimiter(string $line): string {
    $delimiters = [',', ';', '\t'];
    $counts = [];
    foreach ($delimiters as $d) { $counts[$d] = substr_count($line, $d); }
    arsort($counts);
    return key($counts);
}

function canonicalizeHeader(string $h): string {
    $h = strtolower(trim($h));
    $map = [
        // Common teacher identifiers
        'teacherid' => 'teacher_id',
        'teacher id' => 'teacher_id',
        'id' => 'teacher_id',
        'facultyno' => 'FacultyNo',
        'faculty_no' => 'FacultyNo',
        'faculty no' => 'FacultyNo',
        'faculty number' => 'FacultyNo',
        'teacherno' => 'FacultyNo',
        'teacher no' => 'FacultyNo',
        'teacher number' => 'FacultyNo',
        // Names
        'facultyname' => 'FacultyName',
        'faculty_name' => 'FacultyName',
        'faculty name' => 'FacultyName',
        'name' => 'FacultyName',
        'teachername' => 'FacultyName',
        'instructorname' => 'FacultyName',
        'firstname' => 'first_name',
        'lastname' => 'last_name',
        // Enrollment counts
        'enrolledstudents' => 'EnrolledStudents',
        'enrolled' => 'EnrolledStudents',
        'totalenrolled' => 'EnrolledStudents',
        'numberofenrolledstudents' => 'EnrolledStudents',
        'noofenrolledstudents' => 'EnrolledStudents',
        'number of enrolled students' => 'EnrolledStudents',
        // Period 1
        'p1failed' => 'P1_Failed',
        'p1 number of failed' => 'P1_Failed',
        'p1numberoffailed' => 'P1_Failed',
        'p1percent' => 'P1_Percent',
        'p1 % of failed' => 'P1_Percent',
        'p1percentfailed' => 'P1_Percent',
        'p1percentoffailed' => 'P1_Percent',
        'p1offailed' => 'P1_Percent',
        'p1category' => 'P1_Category',
        'p1 categorization' => 'P1_Category',
        'p1categorization' => 'P1_Category',
        // Period 2
        'p2failed' => 'P2_Failed',
        'p2 number of failed' => 'P2_Failed',
        'p2numberoffailed' => 'P2_Failed',
        'p2percent' => 'P2_Percent',
        'p2 % of failed' => 'P2_Percent',
        'p2percentfailed' => 'P2_Percent',
        'p2percentoffailed' => 'P2_Percent',
        'p2offailed' => 'P2_Percent',
        'p2category' => 'P2_Category',
        'p2 categorization' => 'P2_Category',
        'p2categorization' => 'P2_Category',
        // Period 3
        'p3failed' => 'P3_Failed',
        'p3 number of failed' => 'P3_Failed',
        'p3numberoffailed' => 'P3_Failed',
        'p3percent' => 'P3_Percent',
        'p3 % of failed' => 'P3_Percent',
        'p3percentfailed' => 'P3_Percent',
        'p3percentoffailed' => 'P3_Percent',
        'p3category' => 'P3_Category',
        'p3 categorization' => 'P3_Category',
        'p3categorization' => 'P3_Category',
    ];
    return $map[$h] ?? $h;
}

function parseInt($v): int { return intval(str_replace([',',' '], '', strval($v))); }
function parsePercent($v): float {
    $s = trim(strval($v));
    $s = str_replace('%','',$s);
    $n = floatval($s);
    return is_nan($n) ? 0.0 : $n;
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo json_encode(['success' => false, 'message' => 'Method Not Allowed']); exit; }

    if (!isset($_FILES['file'])) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'No file uploaded']); exit; }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Upload error']); exit; }

    $tmpPath = $file['tmp_name'];
    $name = $file['name'];

    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($ext, ['csv'])) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Only CSV files are supported. Export your Excel sheet as CSV first.', 'instructions' => ['Open your Excel file','Click File > Save As','Choose CSV (Comma delimited) (*.csv)','Upload the CSV here.']]); exit; }

    $uploadName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9_.-]/', '_', $name);
    $destPath = __DIR__ . '/../uploads/' . $uploadName;
    if (!move_uploaded_file($tmpPath, $destPath)) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'Failed to store uploaded file']); exit; }

    $fh = fopen($destPath, 'r');
    if (!$fh) { http_response_code(500); echo json_encode(['success' => false, 'message' => 'Failed to read uploaded file']); exit; }

    $firstLine = fgets($fh);
    if ($firstLine === false) { fclose($fh); echo json_encode(['success' => false, 'message' => 'Empty file']); exit; }

    $delimiter = detectDelimiter($firstLine);
    rewind($fh);

    $headers = fgetcsv($fh, 0, $delimiter);
    if (!$headers || count($headers) === 0) { fclose($fh); echo json_encode(['success' => false, 'message' => 'Invalid CSV header']); exit; }
    $headers = array_map('canonicalizeHeader', $headers);

    $rows = [];
    while (($data = fgetcsv($fh, 0, $delimiter)) !== false) {
        $row = [];
        foreach ($headers as $i => $h) { $row[$h] = $data[$i] ?? ''; }
        $rows[] = $row;
    }
    fclose($fh);

    $db = new DatabaseConnection();
    $pdo = $db->pdo();

    // Accept both 'type' and 'kind' to avoid frontend/backend mismatch
    $kind = $_POST['type'] ?? $_POST['kind'] ?? 'teachers';
    $count = 0; $errors = [];

    switch ($kind) {
        case 'students':
            $student = new StudentModel($pdo);
            foreach ($rows as $row) {
                try {
                    $studentData = [
                        'student_id' => $row['student_id'] ?? '',
                        'first_name' => $row['first_name'] ?? '',
                        'last_name' => $row['last_name'] ?? '',
                        'middle_name' => $row['middle_name'] ?? null,
                        'email' => $row['email'] ?? null,
                        'program_name' => $row['program'] ?? 'BSIT',
                        'academic_year' => $row['academic_year'] ?? '2024-2025',
                        'semester' => $row['semester'] ?? '1st',
                        'year_level' => $row['year_level'] ?? '1st Year',
                        'status' => $row['status'] ?? 'active',
                        'gpa' => $row['gpa'] ?? null,
                        'at_risk' => isset($row['at_risk']) ? (bool)$row['at_risk'] : false,
                        'notes' => $row['notes'] ?? null
                    ];
                    $student->create($studentData);
                    $count++;
                } catch (Exception $e) {
                    $errors[] = "Row " . ($count + 1) . ": " . $e->getMessage();
                }
            }
            break;
            
        case 'teachers':
            $teacher = new TeacherModel($pdo);
            // Replace mode: delete existing teacher records before importing new ones
            try {
                $deleted = $pdo->exec('DELETE FROM teachers');
            } catch (Exception $e) {
                // If deletion fails, capture error but continue attempting to import
                $errors[] = "Failed to delete existing teachers: " . $e->getMessage();
            }
            foreach ($rows as $row) {
                try {
                    $teacherData = [
                        'teacher_id' => $row['FacultyNo'] ?? $row['teacher_id'] ?? '',
                        'first_name' => $row['FacultyName'] ?? $row['first_name'] ?? '',
                        'last_name' => '',
                        'middle_name' => null,
                        'email' => $row['email'] ?? null,
                        'department' => $row['department'] ?? 'General',
                        'position' => $row['position'] ?? null,
                        'status' => $row['status'] ?? 'Active',
                        'zone' => $row['zone'] ?? 'green',
                        'notes' => $row['notes'] ?? null,
                        'enrolled_students' => parseInt($row['EnrolledStudents'] ?? $row['enrolled_students'] ?? 0),
                        'p1_failed' => parseInt($row['P1_Failed'] ?? $row['p1_failed'] ?? 0),
                        'p1_percent' => parsePercent($row['P1_Percent'] ?? $row['p1_percent'] ?? 0.00),
                        'p1_category' => $row['P1_Category'] ?? $row['p1_category'] ?? 'GREEN (0%)',
                        'p2_failed' => parseInt($row['P2_Failed'] ?? $row['p2_failed'] ?? 0),
                        'p2_percent' => parsePercent($row['P2_Percent'] ?? $row['p2_percent'] ?? 0.00),
                        'p2_category' => $row['P2_Category'] ?? $row['p2_category'] ?? 'GREEN (0%)',
                        'p3_failed' => parseInt($row['P3_Failed'] ?? $row['p3_failed'] ?? 0),
                        'p3_percent' => parsePercent($row['P3_Percent'] ?? $row['p3_percent'] ?? 0.00),
                        'p3_category' => $row['P3_Category'] ?? $row['p3_category'] ?? 'GREEN (0%)'
                    ];
                    
                    if (isset($row['FacultyName']) && !empty($row['FacultyName'])) {
                        $nameParts = explode(' ', trim($row['FacultyName']));
                        if (count($nameParts) >= 2) {
                            $teacherData['last_name'] = array_pop($nameParts);
                            $teacherData['first_name'] = implode(' ', $nameParts);
                        } else {
                            $teacherData['first_name'] = $row['FacultyName'];
                            $teacherData['last_name'] = '';
                        }
                    }
                    
                    if (empty($teacherData['teacher_id']) || empty($teacherData['first_name'])) {
                        throw new Exception('Missing required fields: FacultyNo/teacher_id and FacultyName/first_name');
                    }
                    
                    $teacher->create($teacherData);
                    $count++;
                } catch (Exception $e) {
                    $errors[] = "Row " . ($count + 1) . ": " . $e->getMessage();
                }
            }
            break;
            
        case 'subjects':
            $subject = new Subject($pdo);
            foreach ($rows as $row) {
                try {
                    $subjectData = [
                        'subject_code' => $row['subject_code'] ?? '',
                        'subject_name' => $row['subject_name'] ?? '',
                        'description' => $row['description'] ?? '',
                        'units' => (int)($row['units'] ?? 3),
                        'year_level' => (int)($row['year_level'] ?? 1),
                        'semester' => $row['semester'] ?? 'Y1S1',
                        // Backend model expects program_id, map simple program names to an ID if needed
                        'program_id' => isset($row['program_id']) ? (int)$row['program_id'] : 1,
                        'cutoff_grade' => (float)($row['cutoff'] ?? $row['cutoff_grade'] ?? 60.0)
                    ];
                    $subject->create($subjectData);
                    $count++;
                } catch (Exception $e) {
                    $errors[] = "Row " . ($count + 1) . ": " . $e->getMessage();
                }
            }
            break;
    }
    
    $filesize = @filesize($destPath) ?: 0;
    $message = '';
    if ($count > 0 && count($errors) === 0) {
        $message = "Imported {$count} row(s).";
    } else if ($count > 0 && count($errors) > 0) {
        $message = "Imported {$count} row(s) with " . count($errors) . " error(s).";
    } else {
        $message = 'No rows imported.';
    }
    $success = $count > 0;

    echo json_encode([
        'success' => $success,
        'message' => $message,
        'count' => $count,
        'errors' => $errors,
        'filename' => $uploadName,
        'filesize' => $filesize,
        'type' => $kind,
    ]);
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}