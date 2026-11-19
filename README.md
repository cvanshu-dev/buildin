# Creator Marketplace — Phase 1 starter

A new Next.js foundation for a brand / creator / model marketplace. The project uses a modular-monolith architecture and keeps the product identity configurable.

## Technology decisions

- Next.js 15 App Router + TypeScript
- Tailwind CSS v4
- Better Auth for authentication (email/password; optional Google OAuth)
- Prisma ORM 6 for database access and migrations (open-source ORM; no Prisma platform subscription required)
- Neon PostgreSQL for hosted database
- Zod for request validation

This project does **not** use Clerk, Prisma Compute or Prisma Postgres.

## Included

- Public marketing landing pages for brands, creators and models
- Better Auth API integration
- Email/password sign-up and sign-in UI
- Optional Google sign-in configuration
- Server-side session lookup
- Prisma schema for Better Auth identity/session/account/verification records
- Marketplace user roles: PENDING, BRAND, CREATOR, MODEL, ADMIN, SUPER_ADMIN
- Onboarding flow for Brand / Creator / Model
- Separate brand, creator, model and admin dashboard entry points
- Admin role is not selectable during public signup

## Requirements

- Node.js 20.9 or newer
- npm
- A PostgreSQL database (Neon is the planned provider)

## 1. Install dependencies

```bash
npm install
cp .env.example .env
```

## 2. Configure Better Auth

Generate a secure secret (do not use the development fallback in production):

```bash
npm run auth:secret
```

Copy the generated value into `BETTER_AUTH_SECRET`. Set `BETTER_AUTH_URL` to your local URL (normally `http://localhost:3000`).

Better Auth handles identity and sessions. The application database stores the user role and marketplace profile relationships.

## 3. Configure Neon PostgreSQL

Create a PostgreSQL project in Neon and paste its connection string into `DATABASE_URL`. Use the connection string recommended by Neon for your deployment environment and keep SSL enabled.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

## 4. Optional: enable Google sign-in

Create OAuth credentials in Google Cloud Console. Add the client ID and secret to `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Configure the authorized redirect URI as:

```text
http://localhost:3000/api/auth/callback/google
```

For production, use your production domain in both `BETTER_AUTH_URL` and Google's authorized redirect URI. Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` only after configuring both credentials and the redirect URI. If disabled, the Google button is hidden.

## 5. Create database tables

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## 6. Run locally

```bash
npm run dev
```

Open http://localhost:3000. Register an account, choose an account type during onboarding, and open the corresponding dashboard.

## Authentication routes

- `/sign-up` — create an account
- `/sign-in` — log in
- `/api/auth/[...all]` — Better Auth API handler
- `/dashboard` — server-side role redirect
- `/onboarding` — select Brand / Creator / Model

## Account and authorization model

- Better Auth creates and manages the identity, account, session and verification records.
- The application `User` row is the same database record managed by Better Auth; marketplace-specific fields are added to it.
- A new user receives role `PENDING` and status `ACTIVE`.
- Public onboarding can assign only `BRAND`, `CREATOR` or `MODEL`.
- `ADMIN` and `SUPER_ADMIN` must be assigned through a trusted, controlled administrative process. Never expose role promotion in a public endpoint.
- Pages and APIs must enforce permissions on the server. Hiding dashboard links is not authorization.

To promote a trusted account to admin, verify the person independently and use a controlled database operation:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'verified-admin@example.com';
```

## Email verification and password reset

Email/password authentication is enabled. Actual email verification and password-reset delivery require an email provider and a configured Better Auth `sendVerificationEmail` / `sendResetPassword` implementation. Resend environment placeholders are included, but email sending is **not yet wired** in this starter. Do not treat email verification or recovery emails as production-ready until that integration and its tests are implemented.

## Project structure

```text
src/
  app/
    api/auth/[...all]/
    api/onboarding/
    dashboard/
      admin/
      brand/
      creator/
      model/
    sign-in/
    sign-up/
    onboarding/
  components/
  lib/
    auth.ts
    auth-client.ts
    current-user.ts
    prisma.ts
prisma/
  schema.prisma
```

## Scope boundary

This is a Phase 1 initialization starter, not a complete marketplace or production-hardened authentication service. It does not yet include creator portfolios, campaign creation, messaging, contracts, payments, payouts, analytics, full organization management, rate limiting, email delivery or production admin tooling.

Before production:

- Wire and test email verification and password-reset email delivery.
- Add rate limiting and abuse protection to authentication and public APIs.
- Add automated tests for authentication, role boundaries and tenant isolation.
- Add account deletion, suspension and recovery workflows.
- Configure production origins, HTTPS, secure cookies and Google OAuth redirect URLs.
- Configure database backups, monitoring and error reporting.
- Review privacy notices and terms with an Indian legal professional.
- Do not collect identity documents, bank details or model measurements until there is a defined business need and access policy.
