# Copia solo lo necesario para APK (<80MB) y despliegue: GitHub Verdel + Expo Pro (testvids22)
# Ejecutar desde la raíz del proyecto: .\crear-copia-despliegue.ps1

$origen = $PSScriptRoot
$destino = Join-Path (Split-Path $origen -Parent) "testvids22"

if (Test-Path $destino) {
    Remove-Item $destino -Recurse -Force
}
New-Item -ItemType Directory -Path $destino -Force | Out-Null

$carpetas = @("app", "components", "contexts", "constants", "lib", "utils", "assets", "public")
foreach ($c in $carpetas) {
    $src = Join-Path $origen $c
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $destino $c) -Recurse -Force
    }
}

$archivos = @(
    "package.json", "package-lock.json", "app.json", "eas.json",
    "tsconfig.json", "babel.config.js", "metro.config.js", "eslint.config.js",
    ".env.example", ".gitignore", ".npmrc", "vercel.json"
)
foreach ($f in $archivos) {
    $src = Join-Path $origen $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $destino $f) -Force
    }
}

# app.json: slug testvids22 para URL acordada (Expo Pro / GitHub Verdel)
$appJsonPath = Join-Path $destino "app.json"
(Get-Content $appJsonPath -Raw) -replace '"slug":"smart-mirror-gv360-nohnd20"', '"slug":"testvids22"' -replace '"name":"SMART MIRROR GV360º"', '"name":"Espejo GV360"' | Set-Content $appJsonPath -Encoding UTF8 -NoNewline

# README mínimo para despliegue
$readme = @"
# Espejo Probador Virtual GV360º (testvids22)

Copia de despliegue: APK <80MB, GitHub Verdel, Expo Pro.

## Requisitos
- Node 18+
- Cuenta Expo (Pro) y EAS CLI: \`npm i -g eas-cli\` y \`eas login\`
- Git (repo en GitHub bajo Verdel)

## Instalación
\`\`\`
npm install
\`\`\`

## Variables de entorno
Copiar \`.env.example\` a \`.env.local\` y rellenar FAL_KEY, REPLICATE_API_TOKEN si aplica.

## Build APK (Expo / EAS)
\`\`\`
eas build --platform android --profile production
\`\`\`
El APK se genera en EAS; descargar desde el enlace que muestra la consola. Perfil \`production\` en eas.json ya usa \`buildType: apk\`.

Para reducir tamaño (objetivo <80MB): el build por defecto ya aplica optimizaciones; si supera 80MB, revisar assets (vídeo boot) o usar AAB para Play Store.

## Despliegue web (Vercel)
Conectar este repo (testvids22) a Vercel; \`vercel.json\` ya está configurado. URL según proyecto Vercel.

## Publicar en Expo (OTA / updates)
\`\`\`
eas update --branch production
\`\`\`

## URL acordada
- Expo: \`https://expo.dev/@TU_CUENTA/testvids22\` (slug = testvids22)
- Sustituir TU_CUENTA por tu usuario Expo (ej. Verdel).
"@
Set-Content (Join-Path $destino "README.md") -Value $readme -Encoding UTF8

Write-Host "Copia creada en: $destino"
Write-Host "Siguiente: cd $destino ; npm install ; eas build --platform android --profile production"
