# Database migrations and schema updates

## If Prisma says "Drift detected" or "We need to reset the database"

**Do not run `prisma migrate reset`** unless you are OK losing all data.

To add new columns (e.g. `receivedBy` on `returns`) **without resetting**:

1. From the `backend` folder run:
   ```bash
   npx prisma db push
   ```
   This applies your current schema to the database. No migration history is used, so there is no drift error and no data loss.

2. Or run the standalone SQL file for the change (e.g. `add-return-received-by.sql`):
   ```bash
   npx prisma db execute --file prisma/add-return-received-by.sql --schema prisma/schema.prisma
   ```

---

# How to run the admin & settings migration SQL

**Do not run the `.sql` file as a shell command** (e.g. `./prisma/add-admin-role-and-settings.sql`).  
That would execute it in Bash and cause errors. The file must be run **against your MySQL database**.

## Option 1: Using Prisma (recommended)

From the `backend` folder:

```bash
npx prisma db execute --file prisma/add-admin-role-and-settings.sql --schema prisma/schema.prisma
```

This uses your `DATABASE_URL` from `.env`.

## Option 2: Using MySQL CLI

```bash
mysql -u YOUR_MYSQL_USER -p YOUR_DATABASE_NAME < prisma/add-admin-role-and-settings.sql
```

Replace `YOUR_MYSQL_USER` and `YOUR_DATABASE_NAME` with your actual MySQL user and database name. You will be prompted for the password.

## Option 3: Use Prisma schema sync instead

If you prefer to let Prisma create/update tables from the schema:

```bash
npm run generate-schema
npx prisma db push
```

Then run the app seed so default admin user and permissions are created:

```bash
npm run dev
```

(Seed runs on startup if the database is empty or missing the new tables/rows.)

## If you already have app_settings with `tagline` column

After adding the Software Name feature, add the new column:

```sql
ALTER TABLE app_settings ADD COLUMN softwareName VARCHAR(255) NULL;
```

Then run `npm run generate-schema` and `npx prisma db push` (or use Prisma migrate).
