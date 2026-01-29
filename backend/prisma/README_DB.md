# Database schema updates

This project uses **Prisma DB Push** for schema changes, not migrations. There is no `migrations` folder.

## When you see "Drift detected" or "We need to reset the database"

Do **not** use `prisma migrate dev` or `prisma migrate reset`. Use this instead:

### Apply schema changes (required fields, new tables, etc.)

From the **backend** folder:

```bash
npm run generate-schema
npx prisma db push
```

Or in one go (PowerShell):

```powershell
cd backend
npm run generate-schema
npx prisma db push
```

- **generate-schema**: Merges `prisma/models/*.prisma` into `prisma/schema.prisma`.
- **db push**: Applies the current schema to the database. No migration history, no reset.

### If `db push` fails (e.g. "column cannot be null")

That usually means existing rows have `NULL` in a column you made required. Either:

1. In MySQL, set those columns to valid IDs for those rows, then run `db push` again, or  
2. Delete the affected rows, then run `db push`.

### Regenerate Prisma Client after schema changes

```bash
npx prisma generate
```

Often this is needed after `db push` so your Node app uses the updated types.
