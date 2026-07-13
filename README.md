# OwnShop

OwnShop is a Next.js business-management PWA for invoices, purchases, payments, suppliers, customers, and reports. It uses Clerk for authentication, Prisma with MongoDB for persistence, and optional Cloudinary/Gemini invoice scanning.

## Getting started

Configure `DATABASE_URL`, Clerk keys, and (if invoice scanning is enabled) Cloudinary and Gemini credentials in `.env`, then run:

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Existing databases

Every business record is isolated by its Clerk owner ID. For an existing database, first assign current records to the correct business owner, then update the database schema:

```powershell
$env:LEGACY_OWNER_ID = 'user_...'
npm run migrate:legacy-data
npm run db:push
```

Use the Clerk user ID for the owner. The migration is intentionally explicit so data is never assigned to the wrong account.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```
