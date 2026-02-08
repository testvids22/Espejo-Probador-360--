@echo off
echo ========================================
echo COMPILAR APK NAVEGADOR LIGERO
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Creando directorios assets...
if not exist "android\app\src\main\assets\rork" mkdir "android\app\src\main\assets\rork"
if not exist "android\app\src\main\assets\orchids" mkdir "android\app\src\main\assets\orchids"

echo [2/4] Copiando build de RORK...
if exist "dist" (
    xcopy /E /I /Y "dist\*" "android\app\src\main\assets\rork\" >nul
    echo   OK: RORK copiado
) else (
    echo   ERROR: No se encuentra dist/
    echo   Ejecuta primero: npm run build:web
    pause
    exit /b 1
)

echo [3/4] Copiando build de Orchids...
if exist "..\orchids-projects\orchids-virtual-try-on-remix-remix\out" (
    xcopy /E /I /Y "..\orchids-projects\orchids-virtual-try-on-remix-remix\out\*" "android\app\src\main\assets\orchids\" >nul
    echo   OK: Orchids copiado
) else (
    echo   ERROR: No se encuentra out/ de Orchids
    echo   Ejecuta primero en Orchids: npm run build
    pause
    exit /b 1
)

echo [4/4] Compilando APK...
cd android
call gradlew assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo APK COMPILADA EXITOSAMENTE
    echo ========================================
    echo.
    echo Ubicacion: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR EN COMPILACION
    echo ========================================
    echo.
    echo Revisa los errores arriba
    echo.
)

pause
