#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "  Athletes First Recruiting Tracker - Quick Start"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install
else
    echo "   ✓ Backend dependencies already installed"
fi

if [ ! -f "database/recruiting_tracker.db" ]; then
    echo "   Initializing database..."
    npm run init-db
else
    echo "   ✓ Database already initialized"
fi

echo "   Starting backend server..."
npm start &
BACKEND_PID=$!

cd ..

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install
else
    echo "   ✓ Frontend dependencies already installed"
fi

echo "   Starting frontend server..."
echo ""
echo "════════════════════════════════════════════════════════"
echo "  🚀 Application starting!"
echo "════════════════════════════════════════════════════════"
echo "  Backend API:  http://localhost:3001"
echo "  Frontend App: http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "════════════════════════════════════════════════════════"
echo ""

npm start

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
