@echo off
echo Cleaning up old NestJS files...
echo.
echo NOTE: Close your IDE/editor before running this script!
echo.
pause

cd src

echo Removing old NestJS directories...
if exist auth rmdir /s /q auth
if exist users rmdir /s /q users
if exist tools rmdir /s /q tools
if exist divisions rmdir /s /q divisions
if exist issues rmdir /s /q issues
if exist returns rmdir /s /q returns
if exist dashboard rmdir /s /q dashboard
if exist reports rmdir /s /q reports
if exist audit-logs rmdir /s /q audit-logs
if exist common rmdir /s /q common

cd ..

echo.
echo Cleanup complete!
echo.
pause
