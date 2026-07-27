# VALKYRIAS

VALKYRIAS is a React 19/Vite frontend with a Java 21 Spring Boot API, Supabase Auth, PostgreSQL, and private Supabase Storage.

## Prerequisites

- Java 21
- Node.js 20 or newer and npm
- A Supabase project with Auth, PostgreSQL, and Storage enabled

The Maven wrapper is included, so a separate Maven installation is optional.

## Safe local configuration

1. Copy `.env.example` to `.env.local`.
2. Replace the placeholders with your own local values.
3. Keep `.env.local` private. It is ignored by Git and is intentionally excluded from distributed ZIP files.
4. Never use a `VITE_*` name for `SUPABASE_SERVICE_ROLE_KEY` or any other backend secret.
5. Run the required SQL migrations against the intended Supabase project before starting the application.
6. Create the private Storage buckets configured by `SUPABASE_PROFILE_BUCKET` and `SUPABASE_ORDER_FILES_BUCKET`.

A newly synchronized Supabase account is created as a CLIENT unless a protected existing application user is already linked to that identity. Role changes are not accepted through normal profile forms.

## Install and run

Install the frontend dependencies once:

```powershell
cd "D:\EDIT HUB\Fixed\Fixedd"
npm install
```

Start the backend in PowerShell terminal 1:

```powershell
cd "D:\EDIT HUB\Fixed\Fixedd"
powershell -ExecutionPolicy Bypass -File ".\scripts\start-backend-local.ps1"
```

The script imports only allowlisted backend values from `.env.local`, selects Java 21 when the configured local JDK is available, and securely prompts for the Supabase database password. The password is not displayed or imported from `.env.local`.

Start the frontend in PowerShell terminal 2:

```powershell
cd "D:\EDIT HUB\Fixed\Fixedd"
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```powershell
npm run lint
npm run build
npm run clean
```

`npm run clean` removes generated `dist`, `target`, and `coverage` folders.

## Updated interface behaviour

- The application opens on the landing page after the branded intro loader.
- A remembered session remains on the landing page and shows the authenticated profile name and photo in the Portal button.
- Client, Editor, and Admin portal headers use the same current profile record.
- Profile updates and avatar changes are reflected immediately after the backend confirms them.
- Project and portfolio cards use safe image fallbacks rather than broken browser-image icons.
- Full-page and inline loading states use the VALKYRIAS shimmer-sweeper logo animation.
- Chat areas scroll only inside their own message containers; data refreshes, profile changes, uploads, and progress-slider movement do not scroll the browser page.

## Profile API

All profile routes require the current Supabase access token as `Authorization: Bearer <token>`:

- `GET /api/profile/me`
- `PUT /api/profile/me`
- `POST /api/profile/me/avatar` using `multipart/form-data`, field name `file`
- `DELETE /api/profile/me/avatar`

The API derives ownership from the verified token and does not accept a browser-supplied owner ID. Avatar object paths remain private; clients receive short-lived signed URLs.

## Payment status

The current repository still contains the existing manual/provider-verification payment workflow. Adding keys to `.env.local` alone does not create a Razorpay Checkout integration. A real gateway must create the provider order on the backend, open the provider checkout in the browser, verify the returned signature on the backend, and only then mark the payment as paid.

## Repository hygiene

Generated and machine-specific folders are excluded from the clean project package, including `node_modules`, `target`, `dist`, editor workspaces, logs, local archives, backups, and secret environment files. Install dependencies locally after extracting the clean ZIP.
