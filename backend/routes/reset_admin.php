<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';

require_once __DIR__ . '/../api/headers.php';

function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'POST';
    if ($method !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

    $data = body();
    $password = trim($data['password'] ?? 'admin123');
    if ($password === '') { http_response_code(400); echo json_encode(['error' => 'Missing password']); exit; }

    $model = UserModel::withDefaultConnection();
    
    // Check if admin user exists
    $existing = $model->findByUsername('admin');
    
    if (!$existing) {
        // Create admin user if it doesn't exist
        try {
            $model->create('admin', $password);
            echo json_encode(['success' => true, 'username' => 'admin', 'message' => 'Admin user created successfully']);
            exit;
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create admin user: ' . $e->getMessage()]);
            exit;
        }
    }
    
    // Reset password if user exists
    $ok = $model->setPassword('admin', $password);
    if (!$ok) { 
        http_response_code(500); 
        echo json_encode(['error' => 'Failed to reset password']); 
        exit; 
    }

    echo json_encode(['success' => true, 'username' => 'admin', 'message' => 'Password reset successfully']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}