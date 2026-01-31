# Mass Seed (Valve Manufacturing)

Seeds the database with valve manufacturing–style masters, items, outward (issues), and inward (returns) so you can see reports and transactions.

## One command (from backend folder)

```bash
cd backend
npm run seed
```

Or from repo root:

```bash
npm run seed --prefix backend
```

## What gets seeded

- **Status master**: Only 2 — `Available`, `Missing`
- **Masters**: Item categories (Gate, Globe, Ball, Butterfly, Check, Control, Safety valves, Actuators), Companies, Contractors, Machines
- **Users**: `qc_admin` / `admin123`, `qc_user` / `password123` (if none exist)
- **Items (tools)**: ~280 items with valve-style names and serials; each uses a static dummy image
- **Outward (Issues)**: 200–280 records, each linked to item, company, contractor, machine, user
- **Inward (Returns)**: ~65% of issues get a return with mixed conditions (OK, Damaged, Calibration Required, Missing); plus some “receive missing item” returns

## Image (dummy)

Item master and return images use a single static image so storage stays simple.

- **Expected path**: `frontend/public/assets/dummy_image.webp`
- **Fallback**: `backend/seed-assets/dummy_image.webp` (copy the file there if the frontend path is not available)
- The seed copies this file into `backend/storage/items/{serial}/master.webp` for each item and into `backend/storage/items/{serial}/inward/...` for each return image.

Run the seed from the **backend** directory so the path to `../frontend/public/assets/dummy_image.webp` resolves correctly.

## Re-running

If the database already has items, the mass seed exits without inserting again. To re-seed, clear (or drop) the `returns`, `issues`, and `tools` (items) data first, then run `npm run seed` again.
