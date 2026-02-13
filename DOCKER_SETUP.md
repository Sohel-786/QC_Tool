# Docker Setup & Architecture Guide

This guide details the Docker architecture for the QC Tool Management System.

## 🏗 Architecture

The application runs as a multi-container Docker application with the following services:

1.  **Frontend (`qc-tool-frontend`)**: Next.js 14 application serving the UI.
2.  **Backend (`qc-tool-backend`)**: .NET 6 Web API handling business logic and data.
3.  **Database (`qc-tool-db`)**: SQL Server 2022 (Developer Edition) storing all data.
4.  **Proxy (`qc-tool-proxy`)**: Nginx reverse proxy that routes requests to Frontend and Backend.

### Request Routing

-   **`http://localhost:86/`** → **Frontend** (Next.js)
-   **`http://localhost:86/api/*`** → **Backend** (API)
-   **`http://localhost:86/storage/*`** → **Backend** (Static Files)

All services communicate through an internal Docker network `qc-network`.

---

## ⚙️ Configuration (.env)

The `.env` file is the `source of truth` for the configuration.

### Port Configuration
-   **APP_PORT**: Check `.env` (Default: **86**)
    -   This is the ONLY port you need to access the app.
    -   Example: `http://localhost:86`

### Database Configuration
-   **DB_CONNECTION_STRING**: Controls where the backend connects.
    -   **Default**: Connects to the internal `database` container.
    -   **Optional**: Can be changed to connect to a local SQL Express instance (see `.env` comments).

### Credentials
-   **DB_PASSWORD**: `Password123!` (Internal SQL Server password)
-   **Default Admin**: `mitul` / `admin`

---

## 🚀 Commands

### Start Application (Recommended)
Use the provided batch script for a one-click start:
```cmd
.\start.bat
```
*This script automatically builds images and starts containers.*

### Manual Docker Commands

1.  **Start Services**:
    ```bash
    docker compose up -d --build
    ```

2.  **Stop Services**:
    ```bash
    docker compose down
    ```

3.  **View Logs**:
    ```bash
    docker compose logs -f
    ```

4.  **Reset Database (Destructive)**:
    To clear all data, stop the containers and remove the volume:
    ```bash
    docker compose down -v
    ```

---

## ⚠️ Troubleshooting

### "Port 86 is already in use"
If you cannot start the app because port 86 is taken:
1.  Open `.env`.
2.  Change `APP_PORT=86` to another port (e.g., `APP_PORT=8080`).
3.  Run `start.bat` again.
4.  Access at `http://localhost:8080`.

### "Database Connection Failed"
-   Ensure the `database` container is healthy (`docker compose ps`).
-   If you modified `DB_CONNECTION_STRING` in `.env` to point to a local DB, verify TCP/IP is enabled and Firewall allows connection.

### "Login Failed"
-   Use default credentials: `mitul` / `admin`.
-   If you changed the database, the seed data might be missing.

---

## 🔐 Security Notes
-   The internal SQL Server password (`Password123!`) is for the isolated container.
-   The application runs in Production mode inside commands defined in `docker-compose.yml`.
