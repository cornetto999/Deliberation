<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/Program.php';

require_once __DIR__ . '/../api/headers.php';

$model = ProgramModel::withDefaultConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $row = $model->find(intval($_GET['id']));
            if (!$row) { 
                http_response_code(404); 
                echo json_encode(['error' => 'Program not found']); 
                exit; 
            }
            echo json_encode($row); 
            exit;
        }
        echo json_encode($model->all()); 
        exit;
    }

    if ($method === 'POST') {
        $id = $model->create(body());
        echo json_encode(['id' => $id, 'success' => true]); 
        exit;
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        if (!isset($_GET['id'])) { 
            http_response_code(400); 
            echo json_encode(['error' => 'Missing program ID']); 
            exit; 
        }
        $ok = $model->update(intval($_GET['id']), body());
        echo json_encode(['success' => $ok]); 
        exit;
    }

    if ($method === 'DELETE') {
        if (!isset($_GET['id'])) { 
            http_response_code(400); 
            echo json_encode(['error' => 'Missing program ID']); 
            exit; 
        }
        $ok = $model->delete(intval($_GET['id']));
        echo json_encode(['success' => $ok]); 
        exit;
    }

    http_response_code(405); 
    echo json_encode(['error' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}













