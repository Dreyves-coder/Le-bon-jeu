param(
    [string]$Destination = (Join-Path $PSScriptRoot "backups"),
    [int]$RetentionCount = 30
)

$ErrorActionPreference = "Stop"

function Find-PostgresTool {
    param([Parameter(Mandatory = $true)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $postgresRoot = "C:\Program Files\PostgreSQL"
    if (Test-Path -LiteralPath $postgresRoot) {
        $candidate = Get-ChildItem -LiteralPath $postgresRoot -Directory |
            Sort-Object { [int]($_.Name -replace "\D", "") } -Descending |
            ForEach-Object { Join-Path $_.FullName "bin\$Name.exe" } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1

        if ($candidate) {
            return $candidate
        }
    }

    throw "$Name est introuvable. Vérifiez que PostgreSQL est installé."
}

function Add-BackupLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    $line = "{0} - {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath (Join-Path $Destination "backup.log") -Value $line -Encoding UTF8
}

if ($RetentionCount -lt 1) {
    throw "RetentionCount doit être supérieur ou égal à 1."
}

$environmentFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "Le fichier backend\.env est introuvable."
}

$databaseLine = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match "^\s*DATABASE_URL\s*=" } |
    Select-Object -First 1

if (-not $databaseLine) {
    throw "DATABASE_URL est absent du fichier backend\.env."
}

$databaseUrl = ($databaseLine -replace "^\s*DATABASE_URL\s*=\s*", "").Trim().Trim('"').Trim("'")
$databaseUri = [Uri]$databaseUrl
$credentials = $databaseUri.UserInfo.Split(":", 2)

if ($credentials.Count -ne 2) {
    throw "DATABASE_URL ne contient pas des identifiants PostgreSQL valides."
}

$databaseUser = [Uri]::UnescapeDataString($credentials[0])
$databasePassword = [Uri]::UnescapeDataString($credentials[1])
$databaseName = [Uri]::UnescapeDataString($databaseUri.AbsolutePath.TrimStart("/"))
$databasePort = if ($databaseUri.IsDefaultPort) { 5432 } else { $databaseUri.Port }

$pgDump = Find-PostgresTool -Name "pg_dump"
$pgRestore = Find-PostgresTool -Name "pg_restore"

$resolvedDestination = [IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Path $resolvedDestination -Force | Out-Null
$Destination = $resolvedDestination

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$finalPath = Join-Path $Destination "mahana_$timestamp.dump"
$temporaryPath = "$finalPath.partial"

try {
    $env:PGPASSWORD = $databasePassword

    & $pgDump `
        --host $databaseUri.Host `
        --port $databasePort `
        --username $databaseUser `
        --dbname $databaseName `
        --format custom `
        --file $temporaryPath `
        --no-password

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump a retourné le code $LASTEXITCODE."
    }

    $archive = Get-Item -LiteralPath $temporaryPath
    if ($archive.Length -lt 1024) {
        throw "La sauvegarde produite est anormalement petite."
    }

    & $pgRestore --list $temporaryPath | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "La vérification de la sauvegarde a échoué."
    }

    Move-Item -LiteralPath $temporaryPath -Destination $finalPath

    $oldBackups = Get-ChildItem -LiteralPath $Destination -File |
        Where-Object { $_.Name -match "^mahana_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.dump$" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $RetentionCount

    foreach ($oldBackup in $oldBackups) {
        if ([IO.Path]::GetDirectoryName($oldBackup.FullName) -eq $Destination) {
            Remove-Item -LiteralPath $oldBackup.FullName
        }
    }

    Add-BackupLog "SUCCÈS - $([IO.Path]::GetFileName($finalPath)) ($([Math]::Round((Get-Item -LiteralPath $finalPath).Length / 1KB, 1)) Ko)"
    Write-Host "Sauvegarde PostgreSQL créée et vérifiée :" -ForegroundColor Green
    Write-Host $finalPath
}
catch {
    if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath
    }

    Add-BackupLog "ÉCHEC - $($_.Exception.Message)"
    throw
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $databasePassword = $null
}
