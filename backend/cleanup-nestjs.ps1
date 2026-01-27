# Cleanup script to remove old NestJS files
# Run this script when files are not locked (close IDE if needed)

Write-Host "Cleaning up old NestJS files..." -ForegroundColor Yellow

$srcPath = ".\src"

# Remove old NestJS module directories
$directoriesToRemove = @(
    "auth",
    "users", 
    "tools",
    "divisions",
    "issues",
    "returns",
    "dashboard",
    "reports",
    "audit-logs",
    "common"
)

foreach ($dir in $directoriesToRemove) {
    $fullPath = Join-Path $srcPath $dir
    if (Test-Path $fullPath) {
        Write-Host "Removing: $fullPath" -ForegroundColor Red
        try {
            Remove-Item -Path $fullPath -Recurse -Force -ErrorAction Stop
            Write-Host "  ✓ Removed successfully" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to remove (file may be locked): $_" -ForegroundColor Red
        }
    }
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
Write-Host "If some files couldn't be removed, close your IDE and run this script again." -ForegroundColor Yellow
