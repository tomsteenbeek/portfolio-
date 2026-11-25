@echo off
cd /d "%~dp0"
title Digitale Informatie - stoppen
echo App en database stoppen (je gegevens blijven bewaard)...
docker compose stop
echo Gestopt.
timeout /t 3 >nul
