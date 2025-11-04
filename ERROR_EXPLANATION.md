# Error Explanation: ERR_CONNECTION_REFUSED

## What's Happening

Your React frontend is trying to connect to a backend API server, but the connection is being refused because **no server is running on port 8000**.

### Error Details:
- **Error Type**: `ERR_CONNECTION_REFUSED`
- **Attempted URL**: `http://localhost:8000/backend/routes/teachers.php`
- **Root Cause**: No server is listening on port 8000

### Current Configuration:
- Your `.env` file is set to: `VITE_API_BASE_URL=http://localhost:8000/backend`
- This means the frontend expects a PHP backend server running on port 8000

## Solutions

### Option 1: Start PHP Built-in Server (Recommended for Development)

Run this command in your terminal from the project root:

```bash
cd /Users/francisjakeroaya/ds
php -S localhost:8000 -t backend
```

This will start a PHP server on port 8000 serving the `backend` directory.

**Keep this terminal window open** while developing. The server runs until you stop it (Ctrl+C).

### Option 2: Use XAMPP (Recommended for Production-like Setup)

If you prefer to use XAMPP (Apache):

1. **Copy the backend to XAMPP** (if not already done):
   ```bash
   cp -r backend /Applications/XAMPP/xamppfiles/htdocs/deliberation
   ```

2. **Update your `.env` file**:
   ```
   VITE_API_BASE_URL=http://localhost/deliberation
   ```

3. **Start XAMPP**:
   - Open XAMPP Control Panel
   - Start Apache and MySQL

4. **Restart your frontend dev server**:
   ```bash
   npm run dev
   ```

## How to Verify

After starting the server, test the connection:

1. **For PHP built-in server**: Visit `http://localhost:8000/` in your browser
2. **For XAMPP**: Visit `http://localhost/deliberation/` in your browser

You should see API documentation or a response from the backend.

## Quick Fix Script

I've created a helper script `start-backend.sh` that you can run to start the PHP server automatically.

