# QC Tool - Docker Setup and Installation Script
# This script checks for Docker, provides installation instructions, and starts the project

Write-Host "🐳 QC Tool - Docker Setup" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Function to check if Docker is available
function Test-Docker {
    try {
        $dockerVersion = docker --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker is running" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  Docker is installed but not running" -ForegroundColor Yellow
            return $false
        }
    } catch {
        return $false
    }
}

# Check if Docker is installed
Write-Host "🔍 Checking for Docker installation..." -ForegroundColor Yellow
$dockerInstalled = Test-Docker

if (-not $dockerInstalled) {
    Write-Host "`n❌ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "`n📥 To install Docker Desktop for Windows:" -ForegroundColor Cyan
    Write-Host "   1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "   2. Run the installer (requires administrator privileges)" -ForegroundColor White
    Write-Host "   3. Restart your computer if prompted" -ForegroundColor White
    Write-Host "   4. Start Docker Desktop from the Start menu" -ForegroundColor White
    Write-Host "   5. Wait for Docker Desktop to fully start (whale icon in system tray)" -ForegroundColor White
    Write-Host "   6. Run this script again" -ForegroundColor White
    
    Write-Host "`n💡 Alternative: Install via winget (if available):" -ForegroundColor Cyan
    Write-Host "   winget install Docker.DockerDesktop" -ForegroundColor Gray
    
    Write-Host "`n💡 Alternative: Install via Chocolatey (if available):" -ForegroundColor Cyan
    Write-Host "   choco install docker-desktop" -ForegroundColor Gray
    
    # Try to open Docker download page
    Write-Host "`n🌐 Opening Docker Desktop download page..." -ForegroundColor Yellow
    Start-Process "https://www.docker.com/products/docker-desktop/"
    
    exit 1
}

# Check if Docker is running
Write-Host "`n🔍 Checking if Docker is running..." -ForegroundColor Yellow
$dockerRunning = Test-DockerRunning

if (-not $dockerRunning) {
    Write-Host "`n⚠️  Docker is installed but not running" -ForegroundColor Yellow
    Write-Host "`n🚀 Attempting to start Docker Desktop..." -ForegroundColor Yellow
    
    # Try to start Docker Desktop
    $dockerDesktopPath = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
    )
    
    $started = $false
    foreach ($path in $dockerDesktopPath) {
        if (Test-Path $path) {
            Write-Host "   Found Docker Desktop at: $path" -ForegroundColor Gray
            Start-Process $path
            Write-Host "   ✅ Docker Desktop is starting..." -ForegroundColor Green
            Write-Host "   ⏳ Please wait 30-60 seconds for Docker to fully start" -ForegroundColor Yellow
            $started = $true
            break
        }
    }
    
    if (-not $started) {
        Write-Host "   ❌ Could not find Docker Desktop executable" -ForegroundColor Red
        Write-Host "   Please start Docker Desktop manually from the Start menu" -ForegroundColor Yellow
    }
    
    # Wait and check again
    Write-Host "`n⏳ Waiting for Docker to start (checking every 5 seconds)..." -ForegroundColor Yellow
    $maxAttempts = 12
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 5
        $attempt++
        Write-Host "   Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
        
        if (Test-DockerRunning) {
            Write-Host "   ✅ Docker is now running!" -ForegroundColor Green
            $dockerRunning = $true
            break
        }
    }
    
    if (-not $dockerRunning) {
        Write-Host "`n❌ Docker did not start in time. Please:" -ForegroundColor Red
        Write-Host "   1. Check if Docker Desktop is running (look for whale icon in system tray)" -ForegroundColor White
        Write-Host "   2. Make sure WSL 2 is installed (Docker Desktop requires it)" -ForegroundColor White
        Write-Host "   3. Try starting Docker Desktop manually" -ForegroundColor White
        Write-Host "   4. Run this script again once Docker is running" -ForegroundColor White
        exit 1
    }
}

# Docker is installed and running, proceed with starting the project
Write-Host "`n✅ Docker is ready!" -ForegroundColor Green
Write-Host "`n🚀 Starting QC Tool project..." -ForegroundColor Cyan

# Change to project directory
Set-Location $PSScriptRoot

# Run the start script
if (Test-Path "start-docker.ps1") {
    Write-Host "`n📜 Running start-docker.ps1..." -ForegroundColor Yellow
    & ".\start-docker.ps1"
} else {
    Write-Host "`n📦 Building and starting Docker containers..." -ForegroundColor Yellow
    docker compose up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Docker containers started successfully!" -ForegroundColor Green
        Write-Host "`n🌐 Access the application:" -ForegroundColor Cyan
        Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
    } else {
        Write-Host "`n❌ Failed to start Docker containers" -ForegroundColor Red
        Write-Host "   Check logs with: docker compose logs" -ForegroundColor Yellow
    }
}
