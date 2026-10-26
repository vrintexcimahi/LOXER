# ==============================================================================
# LOXER Auto-Deploy to Linux Server (samsung-server / 192.168.1.14)
# ==============================================================================

param(
    [string]$Message = "feat(talent-archive): add auto-archive for candidate biodata without genuine profile photo, archive center modal and smart cv integration"
)

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host "=== [1/4] Direktori Project: $projectDir ===" -ForegroundColor Cyan

Write-Host "=== [2/4] Git Add & Commit ===" -ForegroundColor Cyan
git add -A
git status --short
git commit -m $Message -m "Co-Authored-By: Antigravity <noreply@google.com>"

Write-Host "=== [3/4] Git Push to GitHub (origin main) ===" -ForegroundColor Cyan
$pushSuccess = $false
try {
    git push origin main
    if ($LASTEXITCODE -eq 0) { $pushSuccess = $true }
} catch {}

if (-not $pushSuccess) {
    Write-Host "Mencoba push dengan key GitHub eksplisit..." -ForegroundColor Yellow
    git -c core.sshCommand="ssh -i `"$HOME\.ssh\id_ed25519_github`"" push origin main
}

Write-Host "=== [4/4] Eksekusi deploy.sh di Linux Server ===" -ForegroundColor Cyan
try {
    ssh -o StrictHostKeyChecking=no samsung-server "/home/vrintex/loxer/deploy.sh"
} catch {
    ssh -i "$HOME\.ssh\id_ed25519_antigravity" -o StrictHostKeyChecking=no vrintex@192.168.1.14 "/home/vrintex/loxer/deploy.sh"
}

Write-Host "=== Deploy Selesai! ===" -ForegroundColor Green
