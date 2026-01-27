# QC Tool Management System - Setup Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)

## Quick Start with Docker

1. **Clone/Navigate to the project directory**
   ```bash
   cd QC_Tool
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Wait for services to start** (about 30-60 seconds)
   - MySQL will initialize
   - Backend will connect and create tables
   - Frontend will build and start

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - MySQL: localhost:3306

5. **Default Login Credentials**
   - Manager: `qc_manager` / `password123`
   - User: `qc_user` / `password123`

## Local Development Setup

### Backend

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MySQL credentials

4. **Start MySQL** (or use Docker)
   ```bash
   docker run -d --name qc-mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=qc_tool -p 3306:3306 mysql:8.0
   ```

5. **Run database migrations** (TypeORM will auto-sync in development)
   ```bash
   npm run start:dev
   ```

6. **Seed initial data** (optional - run manually or add to startup)
   The seed script will create default users on first run.

### Frontend

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000

## Project Structure

```
QC_Tool/
├── backend/              # NestJS backend
│   ├── src/
│   │   ├── auth/        # Authentication module
│   │   ├── users/        # User management
│   │   ├── tools/        # QC Tools management
│   │   ├── divisions/    # Division management
│   │   ├── issues/       # Tool issuing
│   │   ├── returns/      # Tool returns
│   │   ├── dashboard/    # Dashboard metrics
│   │   ├── reports/      # Reports
│   │   └── audit-logs/   # Audit logging
│   ├── storage/          # Local file storage
│   └── Dockerfile
├── frontend/            # Next.js frontend
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   ├── lib/             # Utilities and API client
│   └── Dockerfile
└── docker-compose.yml   # Docker orchestration
```

## Features

- ✅ User Management (Manager creates users)
- ✅ QC Tool Master (1 record = 1 physical tool)
- ✅ Division Master (inactive divisions blocked)
- ✅ Issue Tool (only AVAILABLE tools)
- ✅ Return Tool (image mandatory)
- ✅ Tool Status flow: AVAILABLE → ISSUED → AVAILABLE / MISSING
- ✅ Dashboard with metrics
- ✅ Reports: Issued tools, Missing tools, Tool history ledger
- ✅ Audit logs for all operations
- ✅ JWT Authentication via HttpOnly cookies
- ✅ Role-based access control (QC_USER, QC_MANAGER)
- ✅ Image uploads stored locally

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/validate` - Validate token

### Users (Manager only)
- `GET /users` - List all users
- `POST /users` - Create user
- `GET /users/:id` - Get user
- `PATCH /users/:id` - Update user
- `PATCH /users/:id/deactivate` - Deactivate user

### Tools
- `GET /tools` - List all tools
- `GET /tools/available` - List available tools
- `POST /tools` - Create tool
- `GET /tools/:id` - Get tool
- `PATCH /tools/:id` - Update tool

### Divisions
- `GET /divisions` - List all divisions
- `GET /divisions/active` - List active divisions
- `POST /divisions` - Create division
- `GET /divisions/:id` - Get division
- `PATCH /divisions/:id` - Update division

### Issues
- `GET /issues` - List all issues
- `GET /issues/active` - List active issues
- `POST /issues` - Create issue
- `GET /issues/:id` - Get issue

### Returns
- `GET /returns` - List all returns
- `POST /returns` - Create return (with image)
- `GET /returns/:id` - Get return

### Dashboard
- `GET /dashboard/metrics` - Get dashboard metrics
- `GET /dashboard/recent-issues` - Get recent issues
- `GET /dashboard/recent-returns` - Get recent returns

### Reports
- `GET /reports/issued-tools` - Issued tools report
- `GET /reports/missing-tools` - Missing tools report
- `GET /reports/tool-history/:toolId` - Tool history ledger

## Troubleshooting

### Docker Issues

1. **Port already in use**
   - Change ports in `docker-compose.yml`
   - Or stop services using those ports

2. **MySQL connection error**
   - Wait for MySQL to fully start (30-60 seconds)
   - Check MySQL logs: `docker logs qc-tool-mysql`

3. **Backend not starting**
   - Check backend logs: `docker logs qc-tool-backend`
   - Ensure MySQL is running first

### Development Issues

1. **TypeORM synchronization**
   - In development, `synchronize: true` auto-creates tables
   - In production, set `synchronize: false` and use migrations

2. **CORS errors**
   - Ensure `FRONTEND_URL` in backend `.env` matches frontend URL
   - Check CORS configuration in `main.ts`

3. **Image upload issues**
   - Ensure `storage/returns` directory exists
   - Check file permissions
   - Verify multer configuration

## Security Notes

- Change `JWT_SECRET` in production
- Use strong passwords
- Enable HTTPS in production
- Review and adjust CORS settings
- Set `synchronize: false` in production for TypeORM

## Support

For issues or questions, please refer to the codebase documentation or contact the development team.
