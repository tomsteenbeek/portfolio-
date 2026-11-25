@echo off
setlocal
cd /d "%~dp0"
title Digitale Informatie - back-up terugzetten
set BESTAND=%~1
if "%BESTAND%"=="" (
  for /f "delims=" %%f in ('dir /b /o-d backups\backup-*.sql 2^>nul') do if not defined BESTAND set BESTAND=backups\%%f
)
if "%BESTAND%"=="" (
  echo Geen back-up gevonden in de map backups.
  pause & exit /b 1
)
echo Je staat op het punt de database te vervangen door:
echo   %BESTAND%
echo Alle wijzigingen sinds deze back-up gaan verloren.
set /p OK=Typ JA om door te gaan: 
if /i not "%OK%"=="JA" ( echo Afgebroken. & pause & exit /b 0 )
docker compose stop app
docker compose exec -T db psql -q -U postgres -d di_portfolio -v ON_ERROR_STOP=0 < "%BESTAND%"
docker compose start app
echo Teruggezet. Open http://localhost:3000
pause
