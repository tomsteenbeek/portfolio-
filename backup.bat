@echo off
setlocal
cd /d "%~dp0"
title Digitale Informatie - back-up
if not exist backups mkdir backups
for /f "delims=" %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set STAMP=%%d
set BESTAND=backups\backup-%STAMP%.sql
echo Back-up maken naar %BESTAND% ...
docker compose exec -T db pg_dump -U postgres -d di_portfolio --clean --if-exists > "%BESTAND%"
if errorlevel 1 (
  echo [x] Back-up mislukt. Draait de app? Start eerst start.bat.
  del "%BESTAND%" 2>nul
  pause & exit /b 1
)
echo Klaar: %BESTAND%
echo Bewaar back-ups op een veilige plek (bijv. je gemeentelijke OneDrive).
pause
