@echo off
REM SheetBrain AI - Authentication Setup Script for Windows
REM This script sets up the local environment for testing the authentication system

setlocal enabledelayedexpansion

echo.
echo 🚀 SheetBrain AI - Auth Setup Script (Windows)
echo ============================================
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed
    exit /b 1
)
echo ✓ Docker is installed

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed
    exit /b 1
)
echo ✓ Docker Compose is installed

node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    exit /b 1
)
echo ✓ Node.js is installed

pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ⚠ pnpm is not installed. Installing...
    npm install -g pnpm
)
echo ✓ pnpm is installed

echo.
echo 📦 Starting Docker services...

if not exist "docker-compose.dev.yml" (
    echo ❌ docker-compose.dev.yml not found
    echo Make sure you're running this script from the workspace root
    exit /b 1
)

docker-compose -f docker-compose.dev.yml up -d

echo ✓ Docker services started
echo.

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
set "count=0"
:wait_loop
docker exec sheetbrain-postgres pg_isready -U postgres >nul 2>&1
if errorlevel 0 (
    echo ✓ PostgreSQL is ready
    goto pg_ready
)
set /a count+=1
if %count% equ 30 (
    echo ❌ PostgreSQL failed to start
    exit /b 1
)
timeout /t 1 >nul
goto wait_loop

:pg_ready
echo.
echo 🔧 Setting up environment variables...

REM Create .env.local if it doesn't exist
if not exist "backend\.env.local" (
    echo Creating backend\.env.local...
    copy backend\.env.example backend\.env.local
    
    REM Generate random SESSION_SECRET
    for /f %%A in ('powershell -NoProfile -Command "[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random).ToString())) | Select-Object -First 1"') do set SESSION_SECRET=%%A
    
    REM Note: For production-grade secret, use:
    REM powershell -NoProfile -Command "[Convert]::ToBase64String([System.Random]::new().NextBytes(32))" 
    
    echo ✓ Environment file created
    echo.
    echo 📝 IMPORTANT: Update these values in backend\.env.local:
    echo    - CLERK_SECRET_KEY
    echo    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    echo    - CLERK_WEBHOOK_SECRET
    echo.
) else (
    echo ✓ Environment file already exists
)

echo.
echo 📚 Installing dependencies...
call pnpm install

echo.
echo 🗄️ Running database migrations...
call pnpm --filter backend db:migrate

echo.
echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo    1. Update CLERK credentials in backend\.env.local
echo    2. Start dev server: pnpm --filter backend dev
echo    3. Run auth tests: pnpm --filter backend test:integration
echo    4. Test login: Use Postman or curl with YOUR_CLERK_SESSION_TOKEN
echo.
echo 🔗 Useful links:
echo    - PostgreSQL: postgresql://postgres:postgres@localhost:5432/sheetbrain
echo    - pgAdmin: http://localhost:5050 (admin@pgadmin.org / admin)
echo    - Redis: redis-cli -h localhost -p 6379
echo.
echo 📖 For more info, see TESTING.md
echo.

endlocal
