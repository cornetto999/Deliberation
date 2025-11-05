# Deliberation System Setup

This project includes a React frontend and PHP backend for a school deliberation system.

## Prerequisites

- XAMPP installed and running
- Node.js and npm installed
- Modern web browser

## Backend Setup (PHP)

1. **Start XAMPP**

   - Open XAMPP Control Panel
   - Start Apache and MySQL services

2. **Setup Database**

   - Open your browser and go to: `http://localhost/deliberation/setup.php`
   - This will create the database and tables automatically
   - Default admin credentials will be created:
     - Username: `admin`
     - Password: `admin123`

3. **Verify Backend**
   - Visit: `http://localhost/deliberation/`
   - You should see the API documentation

## Frontend Setup (React)

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

3. **Access Application**
   - Open your browser and go to: `http://localhost:8080`
   - You'll be redirected to the login page
   - Use the admin credentials to log in## Project Structure

```
ds/
├── backend/                 # PHP backend (copied to XAMPP)
│   ├── config/             # Database configuration
│   ├── models/             # Data models
│   ├── routes/             # API endpoints
│   ├── schema.sql          # Database schema
│   └── setup.php           # Database setup script
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/             # Page components
│   └── lib/               # Utilities
└── /Applications/XAMPP/xamppfiles/htdocs/deliberation/  # XAMPP backend
```

## Features

- **Authentication**: Login/logout with session management
- **Protected Routes**: All pages require authentication
- **Responsive Design**: Mobile-friendly UI using shadcn/ui
- **Database Integration**: MySQL database with PHP backend
- **Modern UI**: Clean, professional interface

## Default Credentials

- **Username**: admin
- **Password**: admin123

## Troubleshooting

1. **Database Connection Issues**

   - Ensure MySQL is running in XAMPP
   - Check database credentials in `backend/config/connection.php`

2. **CORS Issues**

   - Make sure the backend is running on `http://localhost/deliberation/`
   - Check that Apache is running in XAMPP

3. **Frontend Not Loading**
   - Ensure Node.js dependencies are installed
   - Check that the development server is running on port 5173

## Environment Configuration

Create a `.env` file in the project root (you can copy from `.env.example`) to configure both frontend and backend:

- Frontend (Vite):
- `REACT_APP_API_BASE_URL` should point to your backend base URL without a trailing slash.
    - Example (XAMPP Apache): `http://localhost/deliberation`
    - Example (PHP built-in server): `http://localhost:8000/backend`

- Backend (PHP):
  - Database variables used by the backend: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
  - If these are not set, sensible defaults are used (`127.0.0.1`, `3306`, `deliberation`, `root`, empty password).

The backend automatically loads `.env` at runtime.

## Development

- Frontend runs on `http://localhost:8080`
- Backend API runs on `http://localhost/deliberation/`
- Database: MySQL via XAMPP










