# Backup completo del proyecto rork-360 (sin node_modules, .expo, .git, dist)
# Ejecutar: powershell -ExecutionPolicy Bypass -File backup-proyecto.ps1

$fecha = Get-Date -Format "yyyyMMdd-HHmm"
$carpetaOrigen = Split-Path -Parent $MyInvocation.MyCommand.Path
$carpetaBackup = Join-Path (Split-Path -Parent $carpetaOrigen) "rork-360-backup-$fecha"

Write-Host "Creando backup en: $carpetaBackup"
robocopy $carpetaOrigen $carpetaBackup /E /XD node_modules .expo .git dist /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -le 7) { Write-Host "Backup completado: $carpetaBackup" } else { exit $LASTEXITCODE }
