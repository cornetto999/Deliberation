#!/bin/bash

# Script to start the PHP backend server for the Deliberation System
# This script starts a PHP built-in server on port 8000 with CORS support

echo "Starting PHP backend server..."
echo "Server will run at: http://localhost:8000"
echo "API endpoints will be at: http://localhost:8000/backend/routes/"
echo "CORS is enabled for all origins"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
php -S localhost:8000 backend/router.php

