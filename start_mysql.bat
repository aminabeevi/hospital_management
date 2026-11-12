@echo off
:: ============================================================
:: Self-elevate to Administrator if not already running as Admin
:: ============================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dpnx0\"\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   CarePulse HMS - Starting MySQL 8.0 Database Service
echo ========================================================
echo.

net start MySQL80

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] MySQL Database is ONLINE and running!
    echo ========================================================
) else (
    echo.
    echo [INFO] Attempting fallback service start...
    net start MySQL
    if %errorlevel% equ 0 (
        echo.
        echo ========================================================
        echo   [SUCCESS] MySQL Database is ONLINE and running!
        echo ========================================================
    ) else (
        echo.
        echo [ERROR] Could not start MySQL service.
        echo Please verify the service name in Windows Services (services.msc).
    )
)

echo.
echo You can now close this window and run your backend/frontend!
echo.
pause
