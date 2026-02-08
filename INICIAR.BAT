@echo off
cd /d "%~dp0"
title Espejo GV360 - Desarrollo web
echo Iniciando servidor de desarrollo en http://localhost:5070
echo.
npm run web:dev
pause
