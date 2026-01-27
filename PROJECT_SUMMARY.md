# QC Tool Management System - Project Summary

## Overview

A complete internal QC Tool Management Web CRM system built with modern technologies, featuring role-based access control, audit logging, and comprehensive tool tracking capabilities.

## Technology Stack

### Backend
- **Framework**: NestJS 10+ with TypeScript
- **Database**: MySQL 8.0 with TypeORM
- **Authentication**: JWT via HttpOnly cookies
- **File Storage**: Local filesystem (multer)
- **Validation**: class-validator, class-transformer

### Frontend
- **Framework**: Next.js 14 App Router with TypeScript
- **Styling**: Tailwind CSS with custom color scheme
- **UI Components**: Custom ShadCN-inspired components
- **Animations**: Framer Motion for micro-interactions
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: MySQL container
- **Ports**: 
  - Frontend: 3000
  - Backend: 3001
  - MySQL: 3306

## Color Scheme

- **Primary**: #0d6efd (Blue)
- **Secondary**: #6c757d (Gray)
- **Text**: #000000 (Black)
- **Additional shades**: Generated from primary and secondary colors for better UX

## Features Implemented

### ✅ Core Functionality
1. **User Management**
   - Manager can create users
   - Role-based access (QC_USER, QC_MANAGER)
   - User activation/deactivation
   - Password hashing with bcrypt

2. **QC Tool Master**
   - One record = one physical tool
   - Tool codes and names
   - Status tracking (AVAILABLE, ISSUED, MISSING)
   - Tool descriptions

3. **Division Master**
   - Division codes and names
   - Active/inactive status
   - Inactive divisions blocked from receiving tools

4. **Issue Tool**
   - Only AVAILABLE tools can be issued
   - Automatic issue number generation (ISSUE-YYYY-####)
   - Division validation (only active divisions)
   - Tool status automatically changes to ISSUED

5. **Return Tool**
   - Image upload mandatory
   - Automatic status update to AVAILABLE
   - Issue marked as returned
   - Image stored in `/storage/returns/{ISSUE_NO}/`

6. **Tool Status Flow**
   - AVAILABLE → ISSUED (on issue)
   - ISSUED → AVAILABLE (on return)
   - Can be manually set to MISSING

7. **Dashboard**
   - Real-time metrics
   - Tool statistics (total, available, issued, missing)
   - Active issues count
   - Recent issues and returns

8. **Reports**
   - Issued tools report
   - Missing tools report
   - Tool history ledger (full audit trail per tool)

9. **Audit Logs**
   - All operations logged
   - User tracking
   - IP address logging
   - Entity change tracking

### ✅ Security Features
- JWT authentication via HttpOnly cookies
- Role-based access control (RBAC)
- Input validation on all endpoints
- SQL injection protection (TypeORM)
- XSS protection
- CORS configuration
- Password hashing
- No delete APIs (audit-safe)

### ✅ UI/UX Features
- Modern, clean interface
- Micro-animations with Framer Motion
- Responsive design
- Color-coded status indicators
- Loading states
- Error handling
- Form validation
- Smooth transitions

## Project Structure

```
QC_Tool/
├── backend/
│   ├── src/
│   │   ├── auth/              # Authentication & JWT
│   │   ├── users/              # User management
│   │   ├── tools/              # Tool management
│   │   ├── divisions/          # Division management
│   │   ├── issues/             # Tool issuing
│   │   ├── returns/             # Tool returns
│   │   ├── dashboard/          # Dashboard metrics
│   │   ├── reports/            # Reports
│   │   ├── audit-logs/         # Audit logging
│   │   ├── common/             # Shared utilities
│   │   │   ├── decorators/     # Custom decorators
│   │   ├── guards/             # Auth & role guards
│   │   └── interceptors/       # Audit interceptor
│   ├── storage/                # File storage
│   │   └── returns/            # Return images
│   └── Dockerfile
├── frontend/
│   ├── app/                    # Next.js app router
│   │   ├── login/              # Login page
│   │   ├── dashboard/          # Dashboard page
│   │   ├── users/              # User management
│   │   ├── tools/              # Tool management
│   │   ├── divisions/          # Division management
│   │   ├── issues/             # Issue management
│   │   ├── returns/            # Return management
│   │   └── reports/            # Reports
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   └── layout/             # Layout components
│   ├── lib/                    # Utilities & API client
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript types
├── docker-compose.yml
├── README.md
├── SETUP.md
└── PROJECT_SUMMARY.md
```

## API Endpoints Summary

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/validate` - Validate JWT token

### Users (QC_MANAGER only)
- `GET /users` - List all users
- `POST /users` - Create user
- `GET /users/:id` - Get user details
- `PATCH /users/:id` - Update user
- `PATCH /users/:id/deactivate` - Deactivate user

### Tools
- `GET /tools` - List all tools (with optional status filter)
- `GET /tools/available` - List available tools only
- `POST /tools` - Create tool (QC_USER)
- `GET /tools/:id` - Get tool details
- `PATCH /tools/:id` - Update tool (QC_USER)

### Divisions
- `GET /divisions` - List all divisions
- `GET /divisions/active` - List active divisions only
- `POST /divisions` - Create division (QC_USER)
- `GET /divisions/:id` - Get division details
- `PATCH /divisions/:id` - Update division (QC_USER)

### Issues
- `GET /issues` - List all issues
- `GET /issues/active` - List active (non-returned) issues
- `POST /issues` - Create issue (QC_USER)
- `GET /issues/:id` - Get issue details
- `GET /issues/issue-no/:issueNo` - Get issue by issue number

### Returns
- `GET /returns` - List all returns
- `POST /returns` - Create return with image (QC_USER, multipart/form-data)
- `GET /returns/:id` - Get return details
- `GET /returns/issue/:issueId` - Get returns for an issue

### Dashboard
- `GET /dashboard/metrics` - Get dashboard metrics
- `GET /dashboard/recent-issues?limit=10` - Get recent issues
- `GET /dashboard/recent-returns?limit=10` - Get recent returns

### Reports
- `GET /reports/issued-tools?startDate=&endDate=` - Issued tools report
- `GET /reports/missing-tools` - Missing tools report
- `GET /reports/tool-history/:toolId` - Tool history ledger

### Audit Logs (QC_MANAGER only)
- `GET /audit-logs?limit=100` - List audit logs
- `GET /audit-logs/entity/:entityType/:entityId` - Get logs for entity
- `GET /audit-logs/user/:userId?limit=100` - Get logs for user

## Database Schema

### Users
- id, email, password, firstName, lastName, role, isActive, createdBy, timestamps

### Tools
- id, toolCode, toolName, description, status, timestamps

### Divisions
- id, code, name, isActive, timestamps

### Issues
- id, issueNo, toolId, divisionId, issuedBy, issuedTo, remarks, isReturned, timestamps

### Returns
- id, issueId, returnedBy, returnImage, remarks, timestamps

### Audit Logs
- id, userId, action, entityType, entityId, oldValues, newValues, ipAddress, timestamps

## Default Credentials

- **Manager**: manager@qc.com / password123
- **User**: user@qc.com / password123

## Getting Started

### Quick Start (Docker)
```bash
docker-compose up -d
```

Access at http://localhost:3000

### Local Development
See `SETUP.md` for detailed instructions.

## Key Design Decisions

1. **No Delete APIs**: All operations are audit-safe. Use deactivation instead of deletion.

2. **Local File Storage**: Images stored on server filesystem, not cloud. Structure:
   - `/storage/returns/{ISSUE_NO}/filename.jpg`

3. **HttpOnly Cookies**: JWT stored in HttpOnly cookies for better security.

4. **Role-Based UI**: Frontend renders UI based on user role.

5. **TypeORM Synchronize**: Enabled in development, should be disabled in production.

6. **Single Docker Compose**: All services in one file for easy deployment.

## Future Enhancements (Optional)

- Email notifications
- PDF report generation
- Tool barcode scanning
- Advanced search and filters
- Dashboard charts and graphs
- Export to Excel/CSV
- Tool maintenance scheduling
- Multi-language support

## Notes

- Change JWT_SECRET in production
- Use environment variables for all sensitive data
- Enable HTTPS in production
- Set TypeORM synchronize to false in production
- Implement proper migrations for production
- Add rate limiting for API endpoints
- Consider adding request logging middleware

## Support

Refer to `SETUP.md` for setup instructions and troubleshooting.
