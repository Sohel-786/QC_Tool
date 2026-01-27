# QC Tool - Docker Startup Script
# This script starts all Docker services and initializes the database

Write-Host "🐳 Starting QC Tool with Docker..." -ForegroundColor Cyan

# Step 1: Start all services
Write-Host "`n📦 Building and starting Docker containers..." -ForegroundColor Yellow
docker compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker containers. Make sure Docker is running." -ForegroundColor Red
    exit 1
}

# Step 2: Wait for MySQL to be ready
Write-Host "`n⏳ Waiting for MySQL to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 3: Check container status
Write-Host "`n🔍 Checking container status..." -ForegroundColor Yellow
docker compose ps

# Step 4: Initialize database schema
Write-Host "`n🗄️  Initializing database schema..." -ForegroundColor Yellow
docker exec qc-tool-backend npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema initialized!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database push failed. Check backend logs." -ForegroundColor Yellow
}

# Step 5: Seed the database
Write-Host "`n🌱 Seeding database..." -ForegroundColor Yellow
Write-Host "   Note: Seeding requires NODE_ENV=development or manual execution" -ForegroundColor Gray
Write-Host "   Run: docker exec -it qc-tool-backend npm run seed" -ForegroundColor Gray
Write-Host "   Or use the seed-database.ps1 script" -ForegroundColor Gray

# Step 6: Show final status
Write-Host "`n📊 Final Container Status:" -ForegroundColor Cyan
docker compose ps

Write-Host "`n✅ Docker services started!" -ForegroundColor Green
Write-Host "`n🌐 Access the application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "   MySQL:    localhost:3306" -ForegroundColor White

Write-Host "`n🔑 Default Login Credentials (after seeding):" -ForegroundColor Cyan
Write-Host "   Manager: manager@qc.com / password123" -ForegroundColor White
Write-Host "   User:    user@qc.com / password123" -ForegroundColor White

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Wait for all containers to be healthy (check logs)" -ForegroundColor Gray
Write-Host "   2. Run seed-database.ps1 to seed the database" -ForegroundColor Gray
Write-Host "   3. Access http://localhost:3000 in your browser" -ForegroundColor Gray

Write-Host "`n📝 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs:     docker compose logs -f" -ForegroundColor Gray
Write-Host "   Stop:          docker compose down" -ForegroundColor Gray
Write-Host "   Restart:       docker compose restart" -ForegroundColor Gray
Write-Host "   Backend logs:  docker logs qc-tool-backend -f" -ForegroundColor Gray
