<?php
declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../api/headers.php';

try {
    $model = UserModel::withDefaultConnection();
    
    // Check if admin exists
    $admin = $model->findByUsername('admin');
    
    $result = [
        'admin_exists' => $admin !== null,
        'admin_data' => $admin ? [
            'id' => $admin['id'],
            'username' => $admin['username'],
            'has_password_hash' => isset($admin['password_hash']),
            'has_password' => isset($admin['password']),
        ] : null,
    ];
    
    // Try to verify with admin123
    if ($admin) {
        $verified = $model->verify('admin', 'admin123');
        $result['password_works'] = $verified !== null;
        
        // If password doesn't work, try to reset it
        if (!$verified) {
            try {
                $model->setPassword('admin', 'admin123');
                $result['password_reset'] = true;
                $verifiedAfter = $model->verify('admin', 'admin123');
                $result['password_works_after_reset'] = $verifiedAfter !== null;
                if ($verifiedAfter) {
                    $result['message'] = 'Password reset successful! You can now login with admin/admin123';
                } else {
                    $result['message'] = 'Password reset attempted but verification still failing. Check database.';
                }
            } catch (Throwable $e) {
                $result['password_reset_error'] = $e->getMessage();
            }
        } else {
            $result['message'] = 'Admin user exists and password works correctly!';
        }
    } else {
        // Create admin if doesn't exist
        try {
            $model->create('admin', 'admin123');
            $result['admin_created'] = true;
            $verified = $model->verify('admin', 'admin123');
            $result['password_works'] = $verified !== null;
            if ($verified) {
                $result['message'] = 'Admin user created successfully! You can now login with admin/admin123';
            } else {
                $result['message'] = 'Admin user created but password verification failed.';
            }
        } catch (Throwable $e) {
            $result['admin_creation_error'] = $e->getMessage();
        }
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}

