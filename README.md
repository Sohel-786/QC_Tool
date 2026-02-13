# QC Tool Management System

A complete internal QC Tool Management Web CRM built with **.NET Core 6** backend and **Next.js** frontend.

## 🚀 Quick Start (Docker - Recommended)

We recommend running the application using the provided batch script, which handles the entire Docker build and startup process:

```cmd
.\start.bat
```

- **Application URL**: [http://localhost:86](http://localhost:86)
- **API Endpoint**: [http://localhost:86/api](http://localhost:86/api)

---

## 🔑 Default Credentials

The system automatically seeds an admin user on first run (defined in `DbInitializer.cs`):

- **Username**: `mitul`
- **Password**: `admin`
- **Division**: `QC`

---

## 🐳 Docker Setup & Configuration

### 1. Starting the Application
Simply run the `start.bat` file in the root directory. This script will:
1.  Build the Backend and Frontend images.
2.  Start the SQL Server, Backend, Frontend, and Nginx Proxy containers.
3.  Ensure network connectivity between services.

To stop the application, you can run:
```bash
docker compose down
```

### 2. Database Connection (.env)
The database connection string is configured in the `.env` file using the `DB_CONNECTION_STRING` variable.

-   **Docker Internal (Default)**: The application connects to the containerized SQL Server (`Server=database`). This ensures it works out-of-the-box.
-   **Local Database (Optional)**: If you need to connect to your local SQL Express instance, you must:
    1.  Enable TCP/IP and SQL Authentication (sa user) on your local SQL Server.
    2.  Edit `.env` to uncomment the "Local" connection string example provided.

### 3. Environment Variables
The `.env` file controls key configurations:
-   `APP_PORT`: Port to access the app (default: 86).
-   `DB_PASSWORD`: Password for the internal Docker SQL database.
-   `DB_CONNECTION_STRING`: Full connection string used by the backend.

---

## 🛠 Tech Stack

### Backend
- **Framework**: .NET 6 Web API (C#)
- **Database**: SQL Server 2022
- **ORM**: Entity Framework Core
- **Authentication**: JWT Bearer Auth
- **Documentation**: Swagger UI (in Dev mode)

### Frontend
- **Framework**: Next.js 14 App Router + TypeScript
- **Styling**: Tailwind CSS + ShadCN UI
- **State Management**: TanStack Query
- **Validation**: React Hook Form + Zod
- **Type Safety**: Full TypeScript support

---

## 🏃 Local Development

If you prefer to run the services locally without Docker (e.g., for debugging):

### 1. Database Setup
Ensure you have **SQL Server Express** or similar installed locally. Update `net_backend/appsettings.json` with your local connection string.

### 2. Backend (.NET)
```bash
cd net_backend
dotnet restore
dotnet run
```
*Runs on: https://localhost:3001*

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
*Runs on: http://localhost:3000*

---

## 📂 Project Structure

```
QC_Tool/
├── net_backend/        # .NET 6 Web API
├── frontend/           # Next.js 14 Frontend
├── nginx/              # Nginx Proxy Configuration
├── docker-compose.yml  # Docker Orchestration
├── start.bat           # Quick Start Script
├── .env                # Environment Configuration
└── README.md
```
