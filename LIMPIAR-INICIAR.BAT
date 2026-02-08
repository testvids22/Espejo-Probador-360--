@echo off
cd /d "%~dp0"
title Espejo GV360 - Limpiar, construir y servir
echo Limpiando cache...
call node scripts\clean-cache.js
echo.
echo Construyendo web (puede tardar un poco)...
call npm run build:web
if errorlevel 1 (
  echo Error en la construccion.
  pause
  exit /b 1
)
echo.
echo Iniciando servidor en http://localhost:3080
npm run serve:web
pause
