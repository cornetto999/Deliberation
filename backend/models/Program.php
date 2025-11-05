<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/connection.php';

class ProgramModel {
    public function __construct(private PDO $pdo) {}

    public static function withDefaultConnection(): self {
        $db = new DatabaseConnection();
        return new self($db->pdo());
    }

    public function all(): array {
        $stmt = $this->pdo->query('
            SELECT p.*, 
                   COUNT(s.id) as student_count,
                   COUNT(CASE WHEN s.zone = "red" THEN 1 END) as red_zone_count,
                   COUNT(CASE WHEN s.zone = "yellow" THEN 1 END) as yellow_zone_count,
                   COUNT(CASE WHEN s.zone = "green" THEN 1 END) as green_zone_count
            FROM programs p 
            LEFT JOIN students s ON p.id = s.program_id 
            GROUP BY p.id 
            ORDER BY p.program_name ASC
        ');
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array {
        $stmt = $this->pdo->prepare('
            SELECT p.*, 
                   COUNT(s.id) as student_count,
                   COUNT(CASE WHEN s.zone = "red" THEN 1 END) as red_zone_count,
                   COUNT(CASE WHEN s.zone = "yellow" THEN 1 END) as yellow_zone_count,
                   COUNT(CASE WHEN s.zone = "green" THEN 1 END) as green_zone_count
            FROM programs p 
            LEFT JOIN students s ON p.id = s.program_id 
            WHERE p.id = ? 
            GROUP BY p.id
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int {
        $stmt = $this->pdo->prepare('
            INSERT INTO programs (program_code, program_name, description, duration_years) 
            VALUES (?, ?, ?, ?)
        ');
        $stmt->execute([
            $data['program_code'] ?? '',
            $data['program_name'] ?? '',
            $data['description'] ?? null,
            $data['duration_years'] ?? 4,
        ]);
        return intval($this->pdo->lastInsertId());
    }

    public function update(int $id, array $data): bool {
        $fields = [];
        $values = [];
        
        if (isset($data['program_code'])) {
            $fields[] = 'program_code = ?';
            $values[] = $data['program_code'];
        }
        if (isset($data['program_name'])) {
            $fields[] = 'program_name = ?';
            $values[] = $data['program_name'];
        }
        if (isset($data['description'])) {
            $fields[] = 'description = ?';
            $values[] = $data['description'];
        }
        if (isset($data['duration_years'])) {
            $fields[] = 'duration_years = ?';
            $values[] = $data['duration_years'];
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $values[] = $id;
        $sql = 'UPDATE programs SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete(int $id): bool {
        // Check if program has students
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM students WHERE program_id = ?');
        $stmt->execute([$id]);
        $count = $stmt->fetchColumn();
        
        if ($count > 0) {
            throw new Exception('Cannot delete program with existing students');
        }
        
        $stmt = $this->pdo->prepare('DELETE FROM programs WHERE id = ?');
        return $stmt->execute([$id]);
    }
}













