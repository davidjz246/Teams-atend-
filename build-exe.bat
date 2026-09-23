@echo off
title Attendance Tracker - Windows EXE Builder
cls
echo ====================================================================
echo        Wadi Degla Clubs Attendance Tracker - EXE Builder
echo ====================================================================
echo.
echo Compiling native Windows executable (AttendanceTracker.exe)...
echo.

set CSC=
if exist "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
) else if exist "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if "%CSC%"=="" (
    echo [Error] Microsoft .NET C# compiler (csc.exe) was not found.
    echo Creating portable Batch EXE launcher instead...
    copy /y "%~dp0AttendanceTracker-App.bat" "%~dp0AttendanceTracker.bat" >nul
    echo Done! You can run AttendanceTracker.bat directly.
    pause
    exit /b
)

:: Create temporary C# source file
(
echo using System;
echo using System.Diagnostics;
echo using System.IO;
echo using System.Windows.Forms;
echo.
echo class Program
echo {
echo     [STAThread]
echo     static void Main^(^)
echo     {
echo         string dir = AppDomain.CurrentDomain.BaseDirectory;
echo         string appHtml = Path.Combine^(dir, "app.html"^);
echo         string distHtml = Path.Combine^(dir, "dist", "index.html"^);
echo         string target = File.Exists^(appHtml^) ? appHtml : ^(File.Exists^(distHtml^) ? distHtml : ""^);
echo.
echo         if ^(string.IsNullOrEmpty^(target^)^)
echo         {
echo             MessageBox.Show^("Attendance Tracker files not found in the application directory.", "Wadi Degla Attendance Tracker", MessageBoxButtons.OK, MessageBoxIcon.Error^);
echo             return;
echo         }
echo.
echo         string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
echo         if ^(!File.Exists^(edgePath^)^)
echo             edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
echo.
echo         string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
echo         if ^(!File.Exists^(chromePath^)^)
echo             chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
echo.
echo         ProcessStartInfo psi = new ProcessStartInfo^(^);
echo         if ^(File.Exists^(edgePath^)^)
echo         {
echo             psi.FileName = edgePath;
echo             psi.Arguments = "--app=\"" + target + "\" --window-size=1280,850";
echo         }
echo         else if ^(File.Exists^(chromePath^)^)
echo         {
echo             psi.FileName = chromePath;
echo             psi.Arguments = "--app=\"" + target + "\" --window-size=1280,850";
echo         }
echo         else
echo         {
echo             psi.FileName = target;
echo             psi.UseShellExecute = true;
echo         }
echo.
echo         try
echo         {
echo             Process.Start^(psi^);
echo         }
echo         catch ^(Exception ex^)
echo         {
echo             MessageBox.Show^("Error launching app: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error^);
echo         }
echo     }
echo }
) > "%TEMP%\AttendanceTrackerSource.cs"

echo Compiling C# source to AttendanceTracker.exe...
"%CSC%" /target:winexe /out:"%~dp0AttendanceTracker.exe" "%TEMP%\AttendanceTrackerSource.cs" /reference:System.Windows.Forms.dll /reference:System.dll

if exist "%TEMP%\AttendanceTrackerSource.cs" del "%TEMP%\AttendanceTrackerSource.cs"

if exist "%~dp0AttendanceTracker.exe" (
    echo.
    echo ====================================================================
    echo   SUCCESS: AttendanceTracker.exe generated successfully!
    echo   Location: %~dp0AttendanceTracker.exe
    echo ====================================================================
    echo.
    echo You can now double-click AttendanceTracker.exe to run the app as a
    echo native Windows desktop application.
) else (
    echo [Notice] Could not compile binary. Creating AttendanceTracker.bat launcher.
    copy /y "%~dp0AttendanceTracker-App.bat" "%~dp0AttendanceTracker.bat" >nul
)

echo.
pause
