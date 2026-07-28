param(
    [string]$DailyTime = "02:00"
)

$ErrorActionPreference = "Stop"

if ($DailyTime -notmatch "^(?:[01]\d|2[0-3]):[0-5]\d$") {
    throw "L'heure doit être au format HH:mm, par exemple 02:00."
}

$backupScript = Join-Path $PSScriptRoot "backup-postgres.ps1"
if (-not (Test-Path -LiteralPath $backupScript)) {
    throw "Le script backup-postgres.ps1 est introuvable."
}

$taskName = "Mahana - Sauvegarde PostgreSQL"
$powershell = (Get-Command powershell.exe).Source
$arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$backupScript`""
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $DailyTime
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Sauvegarde quotidienne de la base PostgreSQL Mahana." `
    -Force | Out-Null

Write-Host "Sauvegarde automatique installée." -ForegroundColor Green
Write-Host "Tâche : $taskName"
Write-Host "Heure quotidienne : $DailyTime"
Write-Host "Les 30 sauvegardes les plus récentes seront conservées."
