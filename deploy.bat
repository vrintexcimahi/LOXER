@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo [LOXER] Auto Deploy Pipeline to Linux Server (192.168.1.14)
echo ==============================================================================

cd /d "%~dp0"
echo [1/4] Direktori kerja: %CD%

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=feat(talent-archive): add auto-archive for candidate biodata without genuine profile photo, archive center modal and smart cv integration"

echo [2/4] Melakukan Git Staging ^& Commit...
git add -A
git status --short
git commit -m "%COMMIT_MSG%" -m "Co-Authored-By: Antigravity <noreply@google.com>"
if %ERRORLEVEL% equ 0 (
    echo [OK] Commit baru berhasil dibuat.
) else (
    echo [INFO] Tidak ada perubahan baru untuk di-commit, melanjutkan push...
)

echo [3/4] Melakukan Git Push ke origin main...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Git push dengan SSH config default gagal, mencoba dengan GitHub SSH key...
    git -c core.sshCommand="ssh -i \"%USERPROFILE%\.ssh\id_ed25519_github\"" push origin main
)

echo [4/4] Menjalankan deploy.sh di Linux Server (samsung-server)...
ssh -o StrictHostKeyChecking=no samsung-server "bash /home/vrintex/loxer/deploy.sh"
if %ERRORLEVEL% neq 0 (
    echo [INFO] Mencoba SSH dengan key id_ed25519_antigravity...
    ssh -i "%USERPROFILE%\.ssh\id_ed25519_antigravity" -o StrictHostKeyChecking=no vrintex@192.168.1.14 "bash /home/vrintex/loxer/deploy.sh"
)

echo ==============================================================================
echo [SELESAI] Pipeline deploy selesai dieksekusi.
echo ==============================================================================
