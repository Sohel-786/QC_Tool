# Docker Installation Guide for QC Tool

## Quick Installation

### Option 1: Download and Install Manually (Recommended)

1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - The installer will be downloaded (Docker Desktop Installer.exe)

2. **Run the Installer**
   - Double-click the downloaded installer
   - Follow the installation wizard
   - **Important**: Make sure "Use WSL 2 instead of Hyper-V" is checked (recommended)
   - Click "Ok" when installation completes

3. **Restart Your Computer**
   - You may be prompted to restart
   - Restart is required for WSL 2 features

4. **Start Docker Desktop**
   - After restart, find "Docker Desktop" in Start menu
   - Launch Docker Desktop
   - Wait for it to fully start (you'll see a whale icon in system tray)
   - The icon should be steady (not animated) when ready

5. **Verify Installation**
   - Open PowerShell or Command Prompt
   - Run: `docker --version`
   - You should see Docker version information

### Option 2: Install via winget (Windows Package Manager)

If you have winget installed (Windows 10/11):

```powershell
winget install Docker.DockerDesktop
```

After installation, restart your computer and start Docker Desktop.

### Option 3: Install via Chocolatey

If you have Chocolatey installed:

```powershell
choco install docker-desktop
```

After installation, restart your computer and start Docker Desktop.

## Prerequisites

### WSL 2 (Windows Subsystem for Linux 2)

Docker Desktop for Windows requires WSL 2. The Docker Desktop installer will usually set this up automatically, but you can also install it manually:

```powershell
# Run PowerShell as Administrator
wsl --install
```

Or enable WSL 2 manually:
1. Open PowerShell as Administrator
2. Run: `dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart`
3. Run: `dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart`
4. Restart your computer
5. Download and install WSL 2 kernel update from: https://aka.ms/wsl2kernel
6. Set WSL 2 as default: `wsl --set-default-version 2`

## Verify Docker Installation

After installing and starting Docker Desktop, verify it's working:

```powershell
# Check Docker version
docker --version

# Check Docker is running
docker info

# Test with a simple container
docker run hello-world
```

If all commands work, Docker is properly installed and running!

## Troubleshooting

### Docker Desktop won't start
- Make sure WSL 2 is installed and enabled
- Check Windows features: Virtual Machine Platform and Windows Subsystem for Linux
- Restart your computer
- Check Docker Desktop logs: Settings → Troubleshoot → View logs

### "Docker is not recognized"
- Make sure Docker Desktop is running (whale icon in system tray)
- Restart your terminal/PowerShell after installing Docker
- Check if Docker is in PATH: `$env:Path -split ';' | Select-String docker`

### Port conflicts
- If ports 3000, 3001, or 3306 are already in use, you can:
  - Stop the services using those ports
  - Or modify `docker-compose.yml` to use different ports

## After Installation

Once Docker is installed and running:

1. **Run the setup script:**
   ```powershell
   .\setup-docker.ps1
   ```

2. **Or start the project directly:**
   ```powershell
   .\start-docker.ps1
   ```

3. **Or use docker compose directly:**
   ```powershell
   docker compose up -d --build
   ```

## System Requirements

- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
- Windows 11 64-bit: Home or Pro version 21H2 or higher
- WSL 2 feature enabled
- Virtualization enabled in BIOS
- At least 4GB RAM (8GB recommended)
- Hardware virtualization support (VT-x/AMD-V)

## Need Help?

- Docker Desktop documentation: https://docs.docker.com/desktop/windows/
- Docker Desktop issues: https://github.com/docker/for-win/issues
- WSL 2 documentation: https://docs.microsoft.com/windows/wsl/
