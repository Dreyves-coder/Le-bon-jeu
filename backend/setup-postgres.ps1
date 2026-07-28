$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& chcp.com 65001 | Out-Null
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Text.UTF8Encoding]::new($false)

function Read-PlainSecret([string]$Prompt) {
  $secureValue = Read-Host $Prompt -AsSecureString
  return [System.Net.NetworkCredential]::new('', $secureValue).Password
}

function Test-StrongPassword([string]$Password) {
  return $Password.Length -ge 12 `
    -and $Password -cmatch '[A-Z]' `
    -and $Password -cmatch '[a-z]' `
    -and $Password -match '\d' `
    -and $Password -match '[^A-Za-z0-9]'
}

$psqlCandidates = @(
  (Get-Command psql.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
  'C:\Program Files\PostgreSQL\17\bin\psql.exe',
  'C:\Program Files\PostgreSQL\16\bin\psql.exe',
  'C:\Program Files\PostgreSQL\15\bin\psql.exe'
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

$psql = $psqlCandidates | Select-Object -First 1
if (-not $psql) {
  throw 'PostgreSQL est introuvable. Installez PostgreSQL 15 ou plus récent avant de continuer.'
}

Write-Host 'Configuration PostgreSQL de Mahana' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Configuration détectée automatiquement :'
Write-Host '  Serveur     : localhost'
Write-Host '  Port        : 5432'
Write-Host '  Utilisateur : postgres'
Write-Host '  Base        : restaurant_game'
Write-Host ''

$pgHost = 'localhost'
$pgPort = '5432'
$pgUser = 'postgres'
$databaseName = 'restaurant_game'

Write-Host 'Saisissez maintenant le mot de passe choisi lors de l’installation de PostgreSQL.'
Write-Host 'Ce n’est PAS le mot de passe de l’application Mahana.' -ForegroundColor Yellow
$pgPassword = Read-PlainSecret 'Mot de passe PostgreSQL'
$env:PGPASSWORD = $pgPassword

Write-Host 'Vérification de la connexion PostgreSQL...'
& $psql -h $pgHost -p $pgPort -U $pgUser -d postgres -v ON_ERROR_STOP=1 -tAc 'SELECT 1;' | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Connexion refusée. Vérifiez le mot de passe PostgreSQL saisi.'
}

$databaseExists = & $psql -h $pgHost -p $pgPort -U $pgUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$databaseName';"
if (-not $databaseExists) {
  Write-Host "Création de la base '$databaseName'..."
  & $psql -h $pgHost -p $pgPort -U $pgUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE `"$databaseName`";"
}

$adminEmail = Read-Host 'Email de connexion Mahana [admin@mahana.local]'
if (-not $adminEmail) { $adminEmail = 'admin@mahana.local' }

do {
  $adminPassword = Read-PlainSecret 'Nouveau mot de passe pour l’administration Mahana'
  if (-not (Test-StrongPassword $adminPassword)) {
    Write-Host 'Le mot de passe doit contenir 12 caractères, une majuscule, une minuscule, un chiffre et un symbole.' -ForegroundColor Yellow
  }
} until (Test-StrongPassword $adminPassword)

$adminPasswordConfirmation = Read-PlainSecret 'Confirmez le mot de passe administrateur'
if ($adminPassword -cne $adminPasswordConfirmation) {
  throw 'Les deux mots de passe administrateur ne correspondent pas.'
}

$encodedUser = [Uri]::EscapeDataString($pgUser)
$encodedPassword = [Uri]::EscapeDataString($pgPassword)
$encodedDatabase = [Uri]::EscapeDataString($databaseName)
$jwtBytes = New-Object byte[] 48
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$randomGenerator.GetBytes($jwtBytes)
$randomGenerator.Dispose()
$jwtSecret = [Convert]::ToBase64String($jwtBytes)

$envContent = @"
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://${encodedUser}:${encodedPassword}@${pgHost}:${pgPort}/${encodedDatabase}?schema=public"
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN="2h"
ADMIN_EMAIL="$adminEmail"
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DEV_FILE_STORAGE=false
"@

[IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), $envContent, [Text.UTF8Encoding]::new($false))
$env:ADMIN_INITIAL_PASSWORD = $adminPassword
$env:ADMIN_EMAIL = $adminEmail
$env:DATABASE_URL = "postgresql://${encodedUser}:${encodedPassword}@${pgHost}:${pgPort}/${encodedDatabase}?schema=public"

Write-Host 'Installation et génération Prisma...'
& npm.cmd install
if ($LASTEXITCODE -ne 0) { throw 'Échec de npm install.' }
& npm.cmd run prisma:generate
if ($LASTEXITCODE -ne 0) { throw 'Échec de la génération Prisma.' }
& npm.cmd run db:deploy
if ($LASTEXITCODE -ne 0) { throw 'Échec des migrations PostgreSQL.' }
& npm.cmd run db:seed
if ($LASTEXITCODE -ne 0) { throw 'Échec de la création de l’administrateur.' }
& npm.cmd run db:import
if ($LASTEXITCODE -ne 0) { throw 'Échec de l’import des données locales.' }

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:ADMIN_INITIAL_PASSWORD -ErrorAction SilentlyContinue
$pgPassword = $null
$adminPassword = $null
$adminPasswordConfirmation = $null

Write-Host ''
Write-Host 'PostgreSQL et la sécurité administrateur sont configurés.' -ForegroundColor Green
Write-Host "Connectez-vous avec : $adminEmail"
Write-Host 'Le mot de passe n’est pas affiché ni conservé dans le fichier .env.'
