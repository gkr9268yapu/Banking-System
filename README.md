# GKR Bank

A mobile-first banking web app for a college project. Customers send money, pay with QR codes and see their history. One admin manages customers and cash. It can be installed on a phone like an app (PWA).

Built with Next.js (App Router, TypeScript), Tailwind CSS, Recharts, lucide-react, mysql2, bcryptjs and jose. The database is TiDB Cloud (MySQL compatible). It is deployed on Vercel.

## Features

**Customer:** dashboard with charts, transfer by account number (with a live receiver check), transaction history with filters and paging, My Account, QR Pay (My QR image and a camera scanner on phones), Settings with change password.

**Admin:** dashboard with totals and 7-day charts, customers list with search and status filter, create customer, block / unblock / deactivate / reactivate / soft delete, customer detail page, cash deposit and withdraw, all transactions, audit log of every admin action.

## Run it on your computer

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local     # then fill in the values (see below)
npm run seed                   # once: gives the test users a real password
npm run dev
```

Open http://localhost:3000.

`.env.local` is ignored by git. Never commit it and never paste real passwords into code or chat.

| Variable | What it is |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | TiDB Cloud connection (port is 4000) |
| `JWT_SECRET` | Long random text that signs the login cookie. Create one with `openssl rand -hex 32` |
| `SEED_PASSWORD` | Password that `npm run seed` gives to every test account (8 to 72 characters) |

Careful: running `npm run seed` again resets every user's password to `SEED_PASSWORD`. It never runs on Vercel.

## Deploy on Vercel

1. Push the project to GitHub (without `.env.local`).
2. In Vercel choose **Add New > Project** and import the repository. Framework preset: **Next.js**. Build command `next build` and output directory are the defaults.
3. Under **Settings > Environment Variables** add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and `JWT_SECRET` for Production. You do not need `SEED_PASSWORD` on Vercel.
4. In TiDB Cloud open the cluster's network settings and allow connections from Vercel. For a class project the simplest choice is to allow all IP addresses (0.0.0.0/0). Use a strong database password.
5. Deploy. Every `git push` to the main branch deploys again.
6. If login shows "something went wrong", open the Vercel deployment's **Logs**. A missing variable is named in the message.

## Test on a real phone

The phone camera only works on HTTPS, and Vercel gives you HTTPS.

1. Open the Vercel address on the phone and log in.
2. **Install it:** on iPhone use Safari > Share > Add to Home Screen. On Android use Chrome > menu > Install app. It then opens full screen without browser bars. If you changed the manifest or icons, delete the old icon and install again.
3. **QR payment:** log in as customer A on the phone, and open `/qr` as customer B on a laptop. On the phone open **Scan**, allow the camera and scan B's code. Enter an amount and A's password, then pay. Both histories show a "QR payment".
4. **Offline page:** switch the phone to airplane mode and open the app. You see "You are offline", not a browser error.

## Security rules used

- Passwords are stored with bcrypt only. The login cookie is `httpOnly`, signed (HS256) and lasts 8 hours.
- The role and status of the user are read from the database on every page and API call, so blocking a customer works at once.
- Every query uses placeholders (`?`), never text joined into SQL.
- Money is kept as DECIMAL text and calculated exactly. A transfer is one database transaction that locks both accounts, so it either fully happens or not at all.
- A transfer or QR payment needs the password again. Wrong passwords are limited (5 tries, then 15 minutes).
- A QR code holds only `BANKPAY:<random token>`. No balance and no account number.
- Users and transactions are never deleted. "Delete" only sets the status to DELETED.
- The service worker never stores pages, API answers or money data.

## Folders

```
app/
  (auth)/login           Login page
  (customer)/            dashboard, transfer, transactions, account, qr
  (admin)/admin/         dashboard, customers, transactions, cash, audit
  settings/              Profile and change password (both roles)
  api/                   auth, transfer, transactions, qr, admin routes
  manifest.ts            Web app manifest (installable app)
components/              Screen parts (cards, tables, forms, QR scanner)
lib/                     Database, login, money, transfer and QR logic, validators
public/                  Icons, offline page, service worker (sw.js)
proxy.ts                 First role check before every request
scripts/seed-passwords.js  Gives the test users a password (run once)
```

Short comments in the code explain the important steps, especially in `lib/transfer.ts`.

## Commands

```bash
npm run dev      # development server
npm run lint     # check code style
npm run build    # production build (what Vercel runs)
npm run start    # run the production build
```