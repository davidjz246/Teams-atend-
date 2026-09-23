@echo off
title Wadi Degla Attendance & Overtime Tracker
cls
echo ====================================================================
echo   Wadi Degla Clubs - Attendance & Overtime System Launcher
echo ====================================================================
echo.

set "DIST_DIR=%~dp0public_dist"
if not exist "%DIST_DIR%\index.html" (
    set "DIST_DIR=%~dp0dist"
)
set "TARGET_HTML=%DIST_DIR%\index.html"
if not exist "%TARGET_HTML%" (
    set "TARGET_HTML=%~dp0app.html"
)

:: Method 1: Check for Node.js (Vite / Preview / Dev)
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js detected. Starting local server...
    if not exist "%~dp0node_modules" (
        echo [Info] First time setup: Installing dependencies...
        call npm install
    )
    start "" http://localhost:3000
    call npm run dev
    exit /b
)

:: Method 2: Check for Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python detected. Starting lightweight server at http://localhost:3000...
    start "" http://localhost:3000
    python -m http.server 3000 --directory "%DIST_DIR%"
    exit /b
)

:: Method 3: Check for XAMPP PHP
set "PHP_EXE=C:\xampp\php\php.exe"
if exist "%PHP_EXE%" (
    echo [OK] XAMPP PHP detected. Starting local server at http://localhost:3000...
    start "" http://localhost:3000
    "%PHP_EXE%" -S localhost:3000 -t "%DIST_DIR%"
    exit /b
)

where php >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] PHP detected in PATH. Starting local server at http://localhost:3000...
    start "" http://localhost:3000
    php -S localhost:3000 -t "%DIST_DIR%"
    exit /b
)

:: Method 4: Launch Microsoft Edge with file-access flag (bypasses browser file:// CORS)
set "EDGE_EXE="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if defined EDGE_EXE (
    echo [OK] Launching Microsoft Edge App Mode...
    start "" "%EDGE_EXE%" --allow-file-access-from-files --user-data-dir="%TEMP%\wadi_degla_app" --app="file:///%TARGET_HTML:\=/%" --window-size=1380,920
    exit /b
)

:: Method 5: Launch Google Chrome with file-access flag
set "CHROME_EXE="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if defined CHROME_EXE (
    echo [OK] Launching Chrome App Mode...
    start "" "%CHROME_EXE%" --allow-file-access-from-files --user-data-dir="%TEMP%\wadi_degla_app" --app="file:///%TARGET_HTML:\=/%" --window-size=1380,920
    exit /b
)

:: Fallback
echo Opening in default browser...
start "" "%TARGET_HTML%"
