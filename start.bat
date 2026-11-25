@echo off
setlocal
cd /d "%~dp0"
title Digitale Informatie - starten
echo.
echo  Digitale Informatie ^| Strategie ^& Portfolio
echo  ============================================
echo.

where docker >nul 2>nul
if errorlevel 1 goto geendocker
docker info >nul 2>nul
if errorlevel 1 goto dockeruit

if not exist ".git" goto geheim
where git >nul 2>nul
if errorlevel 1 goto geengit
echo [1/3] Nieuwste versie ophalen van GitHub...
git pull --ff-only
if errorlevel 1 echo [i] Bijwerken lukte niet; de huidige versie wordt gebruikt.
goto geheim
:geengit
echo [i] Git niet gevonden: de huidige versie wordt gebruikt.

:geheim
if exist ".env" goto starten
echo [i] Eerste start: geheime sessiesleutel aanmaken in .env
powershell -NoProfile -Command "'SESSION_SECRET=' + [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N') | Set-Content -Encoding ascii .env"
if not exist ".env" goto fout

:starten
echo [2/3] App en database starten. De eerste keer duurt dit enkele minuten...
docker compose up -d --build
if errorlevel 1 goto fout

echo [3/3] Wachten tot de app klaar is...
set /a POGING=0
:wacht
set /a POGING+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto klaar
if %POGING% geq 60 goto traag
timeout /t 3 /nobreak >nul
goto wacht

:klaar
echo.
echo  Klaar. Het dashboard opent in je browser: http://localhost:3000
echo  Afsluiten: dubbelklik op stop.bat ^(je gegevens blijven bewaard^).
start "" http://localhost:3000
timeout /t 5 >nul
exit /b 0

:geendocker
echo [x] Docker Desktop is niet gevonden. Installeer Docker Desktop ^(zie LOKAAL-GEBRUIK.md^).
pause
exit /b 1

:dockeruit
echo [x] Docker Desktop draait nog niet. Start Docker Desktop, wacht tot het
echo     opgestart is en dubbelklik daarna opnieuw op start.bat.
pause
exit /b 1

:traag
echo [x] De app reageert niet. Bekijk de meldingen met: docker compose logs app
pause
exit /b 1

:fout
echo [x] Starten is mislukt. Bekijk de meldingen hierboven.
pause
exit /b 1
