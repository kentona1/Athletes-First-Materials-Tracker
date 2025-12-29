@echo off
echo ========================================================
echo   Athletes First Recruiting Tracker - Quick Start
echo ========================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found
echo.

REM Backend setup
echo Setting up backend...
cd backend

if not exist "node_modules\" (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed
)

if not exist "database\recruiting_tracker.db" (
    echo Initializing database...
    call npm run init-db
) else (
    echo Database already initialized
)

echo Starting backend server...
start "Backend Server" cmd /k npm start

cd ..

REM Frontend setup
echo.
echo Setting up frontend...
cd frontend

if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed
)

echo.
echo ========================================================
echo   Application starting!
echo ========================================================
echo   Backend API:  http://localhost:3001
echo   Frontend App: http://localhost:3000
echo.
echo   Close both windows to stop the servers
echo ========================================================
echo.

echo Starting frontend server...
npm start

cd ..
