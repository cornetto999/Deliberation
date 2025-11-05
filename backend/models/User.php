<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/connection.php';

class UserModel {
    public function __construct(private PDO $pdo) {}

    public static function withDefaultConnection(): self {
        $db = new DatabaseConnection();
        $model = new self($db->pdo());
        $model->bootstrap();
        $model->ensureDefaultAdmin();
        return $model;
    }

    private function bootstrap(): void {
        $this->pdo->exec('CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    }

    public function findByUsername(string $username): ?array {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(string $username, string $password): int {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        // Always use password_hash column (created in bootstrap)
        $stmt = $this->pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        $stmt->execute([$username, $hash]);
        return intval($this->pdo->lastInsertId());
    }

    public function setPassword(string $username, string $password): bool {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        // Always use password_hash column
        $stmt = $this->pdo->prepare("UPDATE users SET password_hash = ? WHERE username = ?");
        return $stmt->execute([$hash, $username]);
    }

    public function verify(string $username, string $password): ?array {
        $user = $this->findByUsername($username);
        if (!$user) { 
            return null; 
        }
        
        // Check password_hash first (primary method)
        if (isset($user['password_hash']) && !empty($user['password_hash'])) {
            $verified = password_verify($password, $user['password_hash']);
            if ($verified) {
                return $user;
            }
            // If verification fails, return null
            return null;
        }
        
        // Fallback: check legacy password column (plain text comparison)
        if (isset($user['password'])) {
            if ($user['password'] === $password) {
                // If using legacy password, upgrade it to hashed
                $this->setPassword($username, $password);
                return $user;
            }
            return null;
        }
        
        // No password field found
        return null;
    }

    private function hasColumn(string $table, string $column): bool {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
        $stmt->execute([$table, $column]);
        $row = $stmt->fetch();
        return intval($row['cnt'] ?? 0) > 0;
    }

    private function ensureDefaultAdmin(): void {
        // Create default admin if not present; credentials in setup docs
        try {
            $existing = $this->findByUsername('admin');
            if ($existing) { return; }
            $this->create('admin', 'admin123');
        } catch (Throwable $e) {
            // Log error but don't fail - allow system to continue
            // This ensures login still works even if admin creation fails
            error_log('Failed to ensure default admin: ' . $e->getMessage());
        }
    }
}