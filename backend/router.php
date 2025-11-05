<?php
declare(strict_types=1);

// Router for PHP built-in server to handle /backend/routes/* requests
// This file should be used when starting the server from project root:
// php -S localhost:8000 backend/router.php

// Set CORS headers FIRST for all requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400'); // 24 hours

// Handle preflight OPTIONS requests immediately
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$backendDir = __DIR__;
$file = $backendDir . $uri;

// If the file exists and is not a directory, serve it directly
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false; // Let PHP serve the file
}

// Handle /deliberation/routes/* requests (for web server setups)
if (preg_match('#^/deliberation/routes/([^/]+)(?:\?.*)?$#', $uri, $matches)) {
    $route = $matches[1];
    $routeFile = $backendDir . '/routes/' . $route;
    
    if (file_exists($routeFile)) {
        require $routeFile;
        return true;
    }
}

// Handle /deliberation/* requests (for index.php, etc.)
if (preg_match('#^/deliberation/(.*)$#', $uri, $matches)) {
    $path = $matches[1] ?: 'index.php';
    $file = $backendDir . '/' . $path;
    
    if (file_exists($file) && !is_dir($file)) {
        require $file;
        return true;
    }
}

// Handle /backend/routes/* requests
if (preg_match('#^/backend/routes/([^/]+)(?:\?.*)?$#', $uri, $matches)) {
    $route = $matches[1];
    $routeFile = $backendDir . '/routes/' . $route;
    
    if (file_exists($routeFile)) {
        require $routeFile;
        return true;
    }
}

// Handle /backend/* requests (for index.php, etc.)
if (preg_match('#^/backend/(.*)$#', $uri, $matches)) {
    $path = $matches[1] ?: 'index.php';
    $file = $backendDir . '/' . $path;
    
    if (file_exists($file) && !is_dir($file)) {
        require $file;
        return true;
    }
}

// Handle root-level routes (for backward compatibility)
if (preg_match('#^/([^/]+)(?:\?.*)?$#', $uri, $matches)) {
    $route = $matches[1];
    $routeFile = $backendDir . '/routes/' . $route . '.php';
    
    if (file_exists($routeFile)) {
        require $routeFile;
        return true;
    }
}

// Default: serve index.php
if (file_exists($backendDir . '/index.php')) {
    require $backendDir . '/index.php';
    return true;
}

// 404
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Not found']);

