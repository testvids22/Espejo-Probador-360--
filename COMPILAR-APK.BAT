@echo off
cd /d "%~dp0"
title Espejo GV360 - Compilar APK (EAS + Gradle)

echo ============================================
echo   COMPILAR APK - Espejo GV360
echo   (Expo EAS Build + Gradle en la nube)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encuentra Node.js. Instalalo desde https://nodejs.org
  pause
  exit /b 1
)

echo [1/4] Instalando dependencias...
call npm install
if errorlevel 1 (
  echo [ERROR] Fallo npm install.
  pause
  exit /b 1
)
echo.

echo [2/4] Comprobando EAS CLI...
call npx eas-cli --version >nul 2>nul
if errorlevel 1 (
  echo Instalando EAS CLI...
  call npm install -g eas-cli
)
echo.

echo [3/4] Iniciando compilacion Android (APK, firma digital, todos los permisos)...
echo      Perfil: production ^(APK en eas.json^)
echo      La primera vez: inicio de sesion Expo y opcion de generar/subir keystore para firma.
echo.
call npx eas-cli build --platform android --profile production
if errorlevel 1 (
  echo.
  echo Para configurar firma digital (keystore) a mano:
  echo   npx eas-cli credentials
  echo Ver LEEME-APK.md para mas detalles.
  pause
  exit /b 1
)

echo.
echo [4/4] Listo. Descarga el APK desde el enlace que ha mostrado EAS
echo       o desde: https://expo.dev/accounts/[tu-cuenta]/projects/smart-mirror-gv360-nohnd20/builds
echo.
pause
