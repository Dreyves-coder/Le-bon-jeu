$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& chcp.com 65001 | Out-Null
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)

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

Write-Host 'Réinitialisation du mot de passe Mahana' -ForegroundColor Cyan
$email = Read-Host 'Email administrateur [admin@mahana.local]'
if (-not $email) { $email = 'admin@mahana.local' }

do {
  $newPassword = Read-PlainSecret 'Nouveau mot de passe administrateur'
  if (-not (Test-StrongPassword $newPassword)) {
    Write-Host 'Utilisez 12 caractères minimum avec majuscule, minuscule, chiffre et symbole.' -ForegroundColor Yellow
  }
} until (Test-StrongPassword $newPassword)

$confirmation = Read-PlainSecret 'Confirmez le nouveau mot de passe'
if ($newPassword -cne $confirmation) {
  throw 'Les deux mots de passe ne correspondent pas.'
}

$env:ADMIN_RESET_EMAIL = $email
$env:ADMIN_RESET_PASSWORD = $newPassword
& node src/utils/reset-admin-password.js
if ($LASTEXITCODE -ne 0) { throw 'La réinitialisation a échoué.' }

Remove-Item Env:ADMIN_RESET_PASSWORD -ErrorAction SilentlyContinue
$newPassword = $null
$confirmation = $null
Write-Host 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.' -ForegroundColor Green
