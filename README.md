# QC Tool Management System

A complete internal QC Tool Management Web CRM built with .NET Core backend and Next.js frontend.

## 🚀 Quick Start (Docker - Recommended)

```powershell
docker compose up -d
```

Access the application at: **http://localhost:83**

For detailed Docker setup, configuration, and troubleshooting, see [DOCKER_SETUP.md](DOCKER_SETUP.md)

## Tech Stack

### Backend

- NestJS + TypeScript
- MySQL with TypeORM
- JWT Authentication
- Role-based access control (QC_USER, QC_MANAGER)

### Frontend

- Next.js 14 App Router + TypeScript
- Tailwind CSS + ShadCN UI
- Framer Motion for animations
- TanStack Query for API calls
- React Hook Form + Zod validation
- React Hot Toast for notifications

## Features

- User Management (Manager creates users)
- QC Tool Master (1 record = 1 physical tool)
- Division Master (inactive divisions blocked)
- Issue Tool (only AVAILABLE tools)
- Return Tool (image mandatory)
- Tool Status flow: AVAILABLE → ISSUED → AVAILABLE / MISSING
- Dashboard with metrics
- Reports: Issued tools, Missing tools, Tool history ledger
- Audit logs for all operations

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Running with Docker

```bash
docker-compose up -d
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MySQL: localhost:3306

### Local Development

#### Backend

```bash
cd backend
npm install
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Default Credentials

- Manager: qc_manager / password123
- User: qc_user / password123
- User: qc_admin / admin123

## Seed Data for realtime results

```bash
cd backend
npm run seed:fresh

## Project Structure

```

QC_Tool/
├── backend/ # NestJS backend
├── frontend/ # Next.js frontend
├── docker-compose.yml
└── README.md

```

```
