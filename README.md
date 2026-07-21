# VALKYRIAS

VALKYRIAS is a React/Vite frontend with a Java 21 Spring Boot API, Supabase Auth, PostgreSQL, and Supabase Storage.

## Prerequisites

- Java 21
- Maven 3.9+
- Node.js 20+ and npm
- A Supabase project with Auth, PostgreSQL, and Storage enabled

## Configuration

1. Copy `.env.example` to `.env.local` and replace every placeholder.
2. Vite loads the `VITE_SUPABASE_*` values and `DEV_API_PROXY_TARGET` from that root `.env.local` file automatically.
3. Export the non-`VITE_*` values to the Spring Boot process or configure them in the deployment secret manager. Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `VITE_*` variable.
4. Run `setup_schema.sql` in the Supabase SQL editor against the target database.
5. Create a private Storage bucket whose name matches `SUPABASE_PROFILE_BUCKET`. Restrict it to PNG, JPEG, and WebP and use the same size ceiling as `PROFILE_AVATAR_MAX_BYTES`.

Existing local account roles remain authoritative. A newly synchronized Supabase user defaults to `CLIENT` unless a trusted `role` or `user_role` value is present in Supabase `app_metadata`. Profile forms never accept a role.

## Run locally

Install and verify the frontend:

```powershell
Copy-Item .env.example .env.local
# Edit .env.local before continuing.
npm install
npm run lint
npm run build
npm run dev
```

In a second PowerShell terminal, import the same ignored file into that process without printing its secrets, then run Spring Boot:

```powershell
Get-Content .env.local | Where-Object { $_ -match '^\s*[^#][^=]*=' } | ForEach-Object {
  $environmentName, $environmentValue = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($environmentName.Trim(), $environmentValue.Trim().Trim('"'), 'Process')
}
mvn clean test
mvn clean package
mvn spring-boot:run
```

The Vite development server runs on `http://localhost:3000`; `DEV_API_PROXY_TARGET` controls where it proxies `/api` requests.

## Profile API

All profile routes require the current Supabase access token as `Authorization: Bearer <token>`:

- `GET /api/profile/me`
- `PUT /api/profile/me`
- `POST /api/profile/me/avatar` (`multipart/form-data`, field name `file`)
- `DELETE /api/profile/me/avatar`

The API derives ownership from the verified token and never accepts a user ID for self-profile operations. Avatar object paths remain private in PostgreSQL; clients receive short-lived signed download URLs.
