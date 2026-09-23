@echo off
title Update & Build Attendance Tracker Files
cls
echo ========================================================
echo   Updating & Compiling Attendance Tracker (Local)
echo ========================================================
echo.

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [Notice] npm is not found in PATH.
    echo If you downloaded a pre-compiled package, open app.html directly.
    pause
    exit /b
)

echo 1. Building latest production bundle...
call npm run build

echo 2. Syncing updated bundle to app.html and root directory...
if not exist assets mkdir assets
copy /y dist\assets\* assets\ >nul
copy /y dist\index.html app.html >nul

echo.
echo ========================================================
echo   SUCCESS! All files updated to latest version.
echo   You can now double click:
echo     - app.html  (to open directly in browser)
echo     - AttendanceTracker-App.bat  (to open app window)
echo ========================================================
echo.
pause
