#!/bin/bash

# ClickAI CRM Hybrid Development Script
# This script runs Postgres & Gateway in Docker, and the App natively on your Mac.

# Get the absolute root directory of the project
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.local.yml"

echo "🧹 Cleaning existing processes on ports 8000 and 4200..."
lsof -ti :8000 | xargs kill -9 2>/dev/null
lsof -ti :4200 | xargs kill -9 2>/dev/null

echo "🧹 Cleaning macOS metadata files..."
dot_clean -m "$PROJECT_ROOT"

echo "🚀 Starting Infrastructure (PostgreSQL & Gateway) in Docker..."
# Explicitly build gateway to ensure nginx.conf changes are baked in (since volumes fail on this SSD)
docker compose -f "$COMPOSE_FILE" up -d db
docker compose -f "$COMPOSE_FILE" up -d --build gateway

# Wait for DB
echo "⏳ Waiting for Database to initialize..."
sleep 5

echo "📦 Starting Backend (Django) natively..."

# Force UNSET of any existing variables that might point to "db"
unset DATABASE_URL
unset POSTGRES_HOST
unset POSTGRES_PORT

# Export environment for native backend - MUST use 127.0.0.1 to avoid some IPv6 localhost issues
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5432
export POSTGRES_USER=clickai_user
export POSTGRES_PASSWORD=strongpassword
export POSTGRES_DB=clickai_crm
export DATABASE_URL=postgres://clickai_user:strongpassword@127.0.0.1:5432/clickai_crm
export DEBUG=True

cd "$PROJECT_ROOT/backend"

# Setup/Activate Virtual Env
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Apply migrations natively
echo "Applying migrations..."
python3 manage.py migrate --noinput

# Start Django
python3 manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

echo "🎨 Starting Frontend (Angular) natively..."
cd "$PROJECT_ROOT/frontend"

# Use npm run start which maps to ng serve
# Bind to 0.0.0.0 so the Docker Gateway can reach it
npm run start -- --host 0.0.0.0 --disable-host-check --proxy-config proxy.conf.json &
FRONTEND_PID=$!

echo "✅ All services are launching!"
echo "--------------------------------------------------"
echo "Unified Gateway (Recommended): http://localhost:8088"
echo "Frontend (Direct): http://localhost:4200"
echo "Backend API (Direct): http://localhost:8000"
echo "--------------------------------------------------"
echo "Keep this terminal open. Press Ctrl+C to stop all."

# Shutdown logic
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    docker compose -f "$COMPOSE_FILE" stop db gateway
    exit
}

trap cleanup INT TERM

# Wait for background processes
wait
