# QC Tool - Professional Docker Setup

This project is fully containerized with Docker, providing a one-command startup experience for the entire application stack.

## 🚀 Quick Start

Simply run:

```powershell
docker compose up -d
```

Access the application at: **http://localhost:83**

## 📦 What's Included

The Docker setup includes:

- **Frontend**: Next.js 14 application (port 3000 internally)
- **Backend**: .NET 6.0 Web API (port 80 internally)
- **Database**: SQL Server 2022 (port 1433)
- **Proxy**: Nginx reverse proxy (exposes everything on port 83)

## ⚙️ Configuration

All configuration is managed through the `.env` file:

```env
# Main application port (change this to access the app on a different port)
APP_PORT=83

# Internal service ports (can be changed if needed)
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Database configuration
DB_PASSWORD=Password123!
DB_DATABASE=QC_Tool_DB
DB_PORT=1433

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:86/api
```

### Changing the Application Port

To run the application on a different port (e.g., port 8080):

1. Edit `.env` file:

   ```env
   APP_PORT=8080
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

2. Restart the containers:

   ```powershell
   docker compose down
   docker compose up -d
   ```

3. Access at: **http://localhost:8080**

## 🏗️ Architecture

```
                    ┌─────────────────┐
                    │   Port 83       │
                    │  Nginx Proxy    │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌──────▼──────┐
         │  Frontend   │          │   Backend   │
         │  (Next.js)  │          │   (.NET 6)  │
         │  Port 3000  │          │   Port 80   │
         └─────────────┘          └──────┬──────┘
                                         │
                                  ┌──────▼──────┐
                                  │  Database   │
                                  │ SQL Server  │
                                  │  Port 1433  │
                                  └─────────────┘
```

### Request Routing

- **`/api/*`** → Backend API
- **`/storage/*`** → Backend static files
- **`/*`** → Frontend application

## 🛠️ Commands

### Start the application

```powershell
docker compose up -d
```

### Stop the application

```powershell
docker compose down
```

### View logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f database
docker compose logs -f proxy
```

### Rebuild and restart

```powershell
docker compose up -d --build
```

### Check status

```powershell
docker compose ps
```

### Access database

```powershell
# Using docker exec
docker exec -it qc-tool-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Password123!"

# Or connect from your host machine
Server: localhost,1433
Username: sa
Password: Password123!
Database: QC_Tool_DB
```

## 📁 Volumes

The setup uses Docker volumes for data persistence:

- **sql_data**: SQL Server database files
- **backend_storage**: Uploaded files and images

Data persists even when containers are stopped or removed.

## 🔧 Troubleshooting

### Port already in use

If port 83 is already in use, change `APP_PORT` in `.env` to a different port.

### Database connection errors

Wait 60 seconds after starting for the database to fully initialize. Check status:

```powershell
docker compose ps
```

The database should show as "healthy".

### Backend not connecting to database

Check backend logs:

```powershell
docker logs qc-tool-backend
```

### Frontend can't reach backend

Check proxy logs:

```powershell
docker logs qc-tool-proxy
```

### Clean slate restart

```powershell
# Remove all containers and volumes
docker compose down -v

# Start fresh
docker compose up -d
```

## 🔐 Security Notes

**For Production:**

1. Change `DB_PASSWORD` in `.env` to a strong password
2. Update JWT secret in `docker-compose.yml` (backend environment)
3. Enable HTTPS with proper SSL certificates
4. Review CORS settings in backend `Program.cs`
5. Use environment-specific configuration files

## 📝 Development vs Production

### Development (Current Setup)

- Uses development database
- Includes debugging symbols
- Hot reload disabled (use local development for that)

### For Local Development

If you want hot reload and faster iteration:

**Backend:**

```powershell
cd net_backend
dotnet run
```

**Frontend:**

```powershell
cd frontend
npm run dev
```

## 🎯 Default Credentials

After the database initializes, you can log in with:

- **Admin**: Check your database seeding script
- **Username**: admin@qc.com
- **Password**: (as configured in your DbInitializer)

## 📊 Monitoring

View real-time container stats:

```powershell
docker stats
```

## 🆘 Support

For issues:

1. Check logs: `docker compose logs -f`
2. Verify all containers are running: `docker compose ps`
3. Ensure ports are not in use: `netstat -ano | findstr :83`
4. Check `.env` configuration

## 🎉 Success!

If everything is working, you should see:

- ✅ All 4 containers running
- ✅ Database showing as "healthy"
- ✅ Application accessible at http://localhost:83
- ✅ API responding at http://localhost:83/api
