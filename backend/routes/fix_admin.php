<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/connection.php';
require_once __DIR__ . '/../api/headers.php';

header('Content-Type: application/json');

try {
    $db = new DatabaseConnection();
    $pdo = $db->pdo();
    
    // Ensure users table exists
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    
    // Delete existing admin if exists
    $stmt = $pdo->prepare('DELETE FROM users WHERE username = ?');
    $stmt->execute(['admin']);
    
    // Create fresh admin with correct password hash
    $password = 'admin123';
    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    $stmt->execute(['admin', $hash]);
    
    // Verify it works
    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute(['admin']);
    $user = $stmt->fetch();
    
    $verified = false;
    if ($user && isset($user['password_hash'])) {
        $verified = password_verify($password, $user['password_hash']);
    }
    
    echo json_encode([
        'success' => true,
        'admin_created' => true,
        'password_verified' => $verified,
        'message' => $verified 
            ? 'Admin user created successfully! You can now login with admin/admin123'
            : 'Admin created but password verification failed - this is unusual',
        'user_id' => $user['id'] ?? null,
        'hash_length' => strlen($hash),
    ], JSON_PRETTY_PRINT);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ], JSON_PRETTY_PRINT);
}

