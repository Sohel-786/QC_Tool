@echo off
echo Starting QC Tool...
echo (Building containers to ensure latest configuration...)
docker compose up -d --build

echo.
echo ===================================================
echo   Application started successfully!             
echo   Access it at: http://localhost:86             
echo ===================================================
echo.
pause
