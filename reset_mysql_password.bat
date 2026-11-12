@echo off
:: ========================================================
:: CarePulse HMS - MySQL Root Password Reset Utility
:: Resets root password to: root
:: ========================================================
echo ========================================================
echo CarePulse HMS - Resetting MySQL Root Password to: root
echo ========================================================
echo.

:: Check for administrative permissions
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo Please right-click "reset_mysql_password.bat" and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo [1/4] Stopping MySQL80 service...
net stop MySQL80

echo [2/4] Generating temporary reset configuration...
(
  echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
  echo FLUSH PRIVILEGES;
) > "%TEMP%\reset_mysql_init.sql"

echo [3/4] Applying new password...
start "" /b "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --init-file="%TEMP%\reset_mysql_init.sql" --console
timeout /t 6 /nobreak > nul
taskkill /f /im mysqld.exe > nul 2>&1

echo [4/4] Restarting MySQL80 service...
net start MySQL80

if exist "%TEMP%\reset_mysql_init.sql" del "%TEMP%\reset_mysql_init.sql"

echo.
echo ========================================================
echo [SUCCESS] Your MySQL root password is now set to: root
echo ========================================================
echo.
pause

