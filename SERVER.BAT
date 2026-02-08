@echo off
cd /d "%~dp0"
title Espejo GV360 - Servidor (build)
echo Sirviendo build en http://localhost:3080
echo Ejecuta antes LIMPIAR-INICIAR.BAT si aun no has generado dist.
echo.
npm run serve:web
pause
