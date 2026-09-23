@echo off
title Install to XAMPP htdocs - Wadi Degla Attendance
cls
echo ====================================================================
echo   Wadi Degla Clubs - Automatic XAMPP htdocs Installer
echo ====================================================================
echo.

set "DEFAULT_HTDOCS=C:\xampp\htdocs"
set "TARGET_FOLDER_NAME=attendance"

:: Check if XAMPP htdocs exists
if not exist "%DEFAULT_HTDOCS%" (
    echo [WARNING] Default XAMPP path not found at %DEFAULT_HTDOCS%
    echo.
    set /p USER_HTDOCS="Please enter your full XAMPP htdocs path (e.g. D:\xampp\htdocs): "
    if defined USER_HTDOCS (
        set "DEFAULT_HTDOCS=%USER_HTDOCS%"
    )
)

if not exist "%DEFAULT_HTDOCS%" (
    echo [ERROR] Could not locate htdocs directory: %DEFAULT_HTDOCS%
    echo Installation aborted.
    pause
    exit /b
)

set "DEST_DIR=%DEFAULT_HTDOCS%\%TARGET_FOLDER_NAME%"

echo [1/3] Target directory: "%DEST_DIR%"
if not exist "%DEST_DIR%" (
    echo Creating directory "%DEST_DIR%"...
    mkdir "%DEST_DIR%"
) else (
    echo Existing folder found. Updating files...
)

echo.
echo [2/3] Copying production bundle and assets...

set "SOURCE_DIR=%~dp0public_dist"
if not exist "%SOURCE_DIR%\index.html" (
    set "SOURCE_DIR=%~dp0dist"
)

if exist "%SOURCE_DIR%\index.html" (
    xcopy /E /I /Y /Q "%SOURCE_DIR%\*" "%DEST_DIR%\"
) else (
    echo [Notice] Pre-built bundle not found, copying root app assets...
    if exist "%~dp0app.html" copy /Y "%~dp0app.html" "%DEST_DIR%\index.html"
    if exist "%~dp0assets" xcopy /E /I /Y /Q "%~dp0assets\*" "%DEST_DIR%\assets\"
)

echo.
echo [3/3] Installation Complete!
echo ====================================================================
echo.
echo  Your app is now installed in XAMPP!
echo  URL: http://localhost/%TARGET_FOLDER_NAME%/
echo.
echo  Make sure Apache is started in your XAMPP Control Panel.
echo ====================================================================
echo.

set /p OPEN_BROWSER="Open http://localhost/%TARGET_FOLDER_NAME%/ in your browser now? (Y/N): "
if /i "%OPEN_BROWSER%"=="Y" (
    start "" http://localhost/%TARGET_FOLDER_NAME%/
)

pause
