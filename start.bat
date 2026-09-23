@echo off
title Wadi Degla Attendance & Overtime Tracker
cls
echo ====================================================================
echo   Wadi Degla Clubs - Attendance & Overtime Tracker Launcher
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

:: Check Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js found. Starting Vite development server...
    if not exist "%~dp0node_modules" (
        echo Installing dependencies...
        call npm install
    )
    start "" http://localhost:3000
    call npm run dev
    exit /b
)

:: Check Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python found. Serving production bundle on http://localhost:3000...
    start "" http://localhost:3000
    python -m http.server 3000 --directory "%DIST_DIR%"
    exit /b
)

:: Check XAMPP PHP
if exist "C:\xampp\php\php.exe" (
    echo [OK] XAMPP PHP found. Serving on http://localhost:3000...
    start "" http://localhost:3000
    "C:\xampp\php\php.exe" -S localhost:3000 -t "%DIST_DIR%"
    exit /b
)

:: Direct browser launcher with CORS bypass
set "EDGE_EXE="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
if defined EDGE_EXE (
    echo [OK] Launching Edge App Mode...
    start "" "%EDGE_EXE%" --allow-file-access-from-files --user-data-dir="%TEMP%\wadi_degla_app" --app="file:///%TARGET_HTML:\=/%" --window-size=1380,920
    exit /b
)

start "" "%TARGET_HTML%"
