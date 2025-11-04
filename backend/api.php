<?php
declare(strict_types=1);

include "api/headers.php";

// Include all models
require_once __DIR__ . '/config/connection.php';
require_once __DIR__ . '/models/Teacher.php';
require_once __DIR__ . '/models/Student.php';
require_once __DIR__ . '/models/Subject.php';
require_once __DIR__ . '/models/Program.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/models/Grade.php';

class API {
    private $teacherModel;
    private $studentModel;
    private $subject;
    private $programModel;
    private $userModel;
    private $gradeModel;
    private $db;

    public function __construct() {
        $this->db = new DatabaseConnection();
        $this->teacherModel = TeacherModel::withDefaultConnection();
        $this->studentModel = StudentModel::withDefaultConnection();
        $this->subject = new Subject($this->db->pdo());
        $this->programModel = ProgramModel::withDefaultConnection();
        $this->userModel = UserModel::withDefaultConnection();
        $this->gradeModel = GradeModel::withDefaultConnection();
    }

    // Helper function to get request body
    private function getBody(): array {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    // Helper function to get JSON from POST
    private function getJson(): array {
        $json = $_POST["json"] ?? null;
        if ($json === null) {
            return $this->getBody();
        }
        if (is_string($json)) {
            $decoded = json_decode($json, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($json) ? $json : [];
    }

    // ==================== TEACHER OPERATIONS ====================
    
    public function GetTeachers() {
        $schoolYear = $_POST['school_year'] ?? $_GET['school_year'] ?? null;
        $semester = $_POST['semester'] ?? $_GET['semester'] ?? null;
        $programParam = isset($_POST['program_id']) ? intval($_POST['program_id']) : (isset($_GET['program_id']) ? intval($_GET['program_id']) : null);
        $recompute = isset($_POST['recompute']) ? (strval($_POST['recompute']) === '1' || strtolower(strval($_POST['recompute'])) === 'true') : 
                    (isset($_GET['recompute']) ? (strval($_GET['recompute']) === '1' || strtolower(strval($_GET['recompute'])) === 'true') : true);

        if (isset($_POST['id']) || isset($_GET['id'])) {
            $id = intval($_POST['id'] ?? $_GET['id']);
            $row = $this->teacherModel->find($id);
            if (!$row) {
                http_response_code(404);
                return json_encode(['error' => 'Teacher not found']);
            }
            if ($recompute) {
                $stats = $this->teacherModel->aggregateStatsForTeacher($id, $schoolYear, $semester, $programParam);
                $enrolled = intval($stats['enrolled_students'] ?? 0);
                $failed = intval($stats['failed_students'] ?? 0);
                if ($enrolled > 0 || $failed > 0) {
                    $row = array_merge($row, $stats);
                    $row['zone'] = $stats['zone'];
                }
            }
            return json_encode($row);
        }

        $rows = $this->teacherModel->all();
        if ($recompute) {
            foreach ($rows as &$row) {
                $stats = $this->teacherModel->aggregateStatsForTeacher(intval($row['id']), $schoolYear, $semester, $programParam);
                $enrolled = intval($stats['enrolled_students'] ?? 0);
                $failed = intval($stats['failed_students'] ?? 0);
                if ($enrolled > 0 || $failed > 0) {
                    $row = array_merge($row, $stats);
                    $row['zone'] = $stats['zone'];
                }
            }
            unset($row);
        }
        return json_encode($rows);
    }

    public function CreateTeacher() {
        $data = $this->getJson();
        $id = $this->teacherModel->create($data);
        return json_encode(['id' => $id, 'success' => true]);
    }

    public function UpdateTeacher() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $data = $this->getJson();
        $ok = $this->teacherModel->update($id, $data);
        return json_encode(['success' => $ok]);
    }

    public function DeleteTeacher() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $ok = $this->teacherModel->delete($id);
        return json_encode(['success' => $ok]);
    }

    // ==================== STUDENT OPERATIONS ====================
    
    public function GetStudents() {
        if (isset($_POST['id']) || isset($_GET['id'])) {
            $id = intval($_POST['id'] ?? $_GET['id']);
            $row = $this->studentModel->find($id);
            if (!$row) {
                http_response_code(404);
                return json_encode(['error' => 'Student not found']);
            }
            return json_encode($row);
        }
        $rows = $this->studentModel->all();
        return json_encode($rows);
    }

    public function CreateStudent() {
        $data = $this->getJson();
        $id = $this->studentModel->create($data);
        return json_encode(['id' => $id, 'success' => true]);
    }

    public function UpdateStudent() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $data = $this->getJson();
        $ok = $this->studentModel->update($id, $data);
        return json_encode(['success' => $ok]);
    }

    public function DeleteStudent() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $ok = $this->studentModel->delete($id);
        return json_encode(['success' => $ok]);
    }

    // ==================== SUBJECT OPERATIONS ====================
    
    public function GetSubjects() {
        if (isset($_POST['id']) || isset($_GET['id'])) {
            $id = intval($_POST['id'] ?? $_GET['id']);
            $row = $this->subject->getById($id);
            if (!$row) {
                http_response_code(404);
                return json_encode(['error' => 'Subject not found']);
            }
            return json_encode($row);
        }
        $rows = $this->subject->getAll();
        return json_encode($rows);
    }

    public function CreateSubject() {
        $data = $this->getJson();
        $id = $this->subject->create($data);
        return json_encode(['id' => $id, 'success' => true]);
    }

    public function UpdateSubject() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $data = $this->getJson();
        $ok = $this->subject->update($id, $data);
        return json_encode(['success' => $ok]);
    }

    public function DeleteSubject() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $ok = $this->subject->delete($id);
        return json_encode(['success' => $ok]);
    }

    // ==================== PROGRAM OPERATIONS ====================
    
    public function GetPrograms() {
        if (isset($_POST['id']) || isset($_GET['id'])) {
            $id = intval($_POST['id'] ?? $_GET['id']);
            $row = $this->programModel->find($id);
            if (!$row) {
                http_response_code(404);
                return json_encode(['error' => 'Program not found']);
            }
            return json_encode($row);
        }
        $rows = $this->programModel->all();
        return json_encode($rows);
    }

    public function CreateProgram() {
        $data = $this->getJson();
        $id = $this->programModel->create($data);
        return json_encode(['id' => $id, 'success' => true]);
    }

    public function UpdateProgram() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $data = $this->getJson();
        $ok = $this->programModel->update($id, $data);
        return json_encode(['success' => $ok]);
    }

    public function DeleteProgram() {
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);
        if ($id === 0) {
            http_response_code(400);
            return json_encode(['error' => 'Missing id']);
        }
        $ok = $this->programModel->delete($id);
        return json_encode(['success' => $ok]);
    }

    // ==================== OTHER OPERATIONS ====================
    
    public function GetTeacherSummary() {
        require_once __DIR__ . '/routes/teacher_summary.php';
        // This will handle the summary logic
        return json_encode(['message' => 'Use teacher_summary.php route directly']);
    }
}

// Main handler
$operation = $_POST["operation"] ?? $_GET["operation"] ?? "0";
$api = new API();

switch ($operation) {
    // Teacher operations
    case "GetTeachers":
        echo $api->GetTeachers();
        break;
    case "CreateTeacher":
        echo $api->CreateTeacher();
        break;
    case "UpdateTeacher":
        echo $api->UpdateTeacher();
        break;
    case "DeleteTeacher":
        echo $api->DeleteTeacher();
        break;
    
    // Student operations
    case "GetStudents":
        echo $api->GetStudents();
        break;
    case "CreateStudent":
        echo $api->CreateStudent();
        break;
    case "UpdateStudent":
        echo $api->UpdateStudent();
        break;
    case "DeleteStudent":
        echo $api->DeleteStudent();
        break;
    
    // Subject operations
    case "GetSubjects":
        echo $api->GetSubjects();
        break;
    case "CreateSubject":
        echo $api->CreateSubject();
        break;
    case "UpdateSubject":
        echo $api->UpdateSubject();
        break;
    case "DeleteSubject":
        echo $api->DeleteSubject();
        break;
    
    // Program operations
    case "GetPrograms":
        echo $api->GetPrograms();
        break;
    case "CreateProgram":
        echo $api->CreateProgram();
        break;
    case "UpdateProgram":
        echo $api->UpdateProgram();
        break;
    case "DeleteProgram":
        echo $api->DeleteProgram();
        break;

    default:
        echo json_encode(["error" => "Invalid or missing operation", "available_operations" => [
            "GetTeachers", "CreateTeacher", "UpdateTeacher", "DeleteTeacher",
            "GetStudents", "CreateStudent", "UpdateStudent", "DeleteStudent",
            "GetSubjects", "CreateSubject", "UpdateSubject", "DeleteSubject",
            "GetPrograms", "CreateProgram", "UpdateProgram", "DeleteProgram"
        ]]);
        http_response_code(400);
        break;
}

