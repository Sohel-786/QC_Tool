# Cleanup Old NestJS Files

Since we've converted from NestJS to Express.js, we need to remove all old NestJS-specific files.

## Files/Directories to Remove:

### Directories (entire folders):
- `src/auth/` - Old NestJS auth module
- `src/users/` - Old NestJS users module  
- `src/tools/` - Old NestJS tools module
- `src/divisions/` - Old NestJS divisions module
- `src/issues/` - Old NestJS issues module
- `src/returns/` - Old NestJS returns module
- `src/dashboard/` - Old NestJS dashboard module
- `src/reports/` - Old NestJS reports module
- `src/audit-logs/` - Old NestJS audit-logs module
- `src/common/` - Old NestJS common (guards, decorators, interceptors)

### Individual Files (already removed):
- ✅ `src/app.controller.ts`
- ✅ `src/app.module.ts`
- ✅ `src/app.service.ts`
- ✅ `src/main.ts`

## How to Clean Up:

### Option 1: Use PowerShell Script
```powershell
cd backend
.\cleanup-nestjs.ps1
```

### Option 2: Manual Deletion
1. Close your IDE/editor
2. Delete the directories listed above manually
3. Or use: `Remove-Item -Recurse -Force src\auth,src\users,src\tools,src\divisions,src\issues,src\returns,src\dashboard,src\reports,src\audit-logs,src\common`

## What We're Keeping (Express.js Structure):

✅ `src/controllers/` - Express controllers
✅ `src/routes/` - Express routes
✅ `src/entities/` - Prisma service objects
✅ `src/middleware/` - Express middleware
✅ `src/utils/` - Utilities
✅ `src/constants/` - Constants
✅ `src/external-libraries/` - Prisma client
✅ `src/database/` - Seed script
✅ `src/app.ts` - Express app
✅ `src/index.ts` - Server entry point

## After Cleanup:

Your backend structure should only have:
```
src/
├── controllers/     # Express controllers
├── routes/          # Express routes
├── entities/        # Prisma entities
├── middleware/      # Express middleware
├── utils/           # Utilities
├── constants/       # Constants
├── external-libraries/  # Prisma client
├── database/        # Seed script
├── app.ts           # Express app
└── index.ts         # Entry point
```
