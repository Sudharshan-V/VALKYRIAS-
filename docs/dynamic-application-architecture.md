# Dynamic application architecture and validation

Status date: 2026-07-22

This implementation keeps Supabase Auth as the only credential provider. Spring validates each bearer token with Supabase Auth, resolves the normalized `public.users` row by `supabase_user_id`, and uses `public.users.role` as the only authorization role. Browser-editable JWT metadata is never used to grant `ADMIN` or `EDITOR` authority.

## Responsibility boundaries

| Concern | Owner |
|---|---|
| Sign-up, sign-in, refresh, recovery, logout | Supabase Auth |
| Application identity and role | `public.users`; resolved by Spring |
| Orders, assignment, workflow, chat, files, notifications, payments, reviews | Spring Boot services and Supabase PostgreSQL |
| Private file bytes and signed downloads | Supabase Storage through Spring |
| Change notification | Supabase Realtime SELECT streams protected by RLS |
| UI state | React; authoritative records are refetched from Spring |

All important writes go through Spring. The browser never supplies an effective owner, sender, client, payment result, role, or Storage path.

## Additive migration

`database/migrations/V20260722_01__create_dynamic_application_domain.sql` is a manual, transactional, additive migration. It does not reset data, copy ambiguous legacy demo rows, delete Auth users, or clear Storage. It adds account state and portfolio publication flags plus normalized services, packages, orders, assignments, requirements, conversations, participants, conversation messages, read state, files, revisions, notifications, payments, reviews, and audit events. The normalized conversation table is `public.conversation_messages`; legacy `public.messages` and `public.chat_messages` remain untouched.

The migration:

- grants browsers SELECT only and revokes business writes;
- enables RLS on the normalized domain;
- uses read-only `SECURITY DEFINER` helpers bound to `auth.uid()` to avoid recursive RLS joins;
- rejects incompatible pre-existing dynamic tables before the first schema mutation;
- adds event-bearing tables to `supabase_realtime` only when the publication exists and the table is not already present;
- defines update-time triggers locally, so it does not depend on a reset/setup script.

It has not been executed automatically. Apply it through the Supabase SQL editor or the project's reviewed migration process before starting the backend with Hibernate validation. Review and apply `V20260721_03__normalize_user_roles.sql` separately only if that accepted authentication migration has not already been applied; it intentionally normalizes roles and clears obsolete local-password material.

When `psql` and the Supabase dashboard are unavailable, the project includes a secure JDBC runner. It accepts only versioned files under `database/migrations`, prompts for the database password without echoing it, and wraps each migration in a transaction:

```powershell
.\scripts\apply-dynamic-migration.ps1
```

The runner defaults only to the additive dynamic-domain migration and never runs automatically. It performs an offline ordering/column preflight before connecting, checks existing `CREATE TABLE IF NOT EXISTS` targets through read-only JDBC metadata, and commits only after every statement succeeds. PostgreSQL-only migration scenarios can be exercised against a disposable Testcontainers database when Docker is installed:

```powershell
.\mvnw.cmd -Pmigration-it -Dtest=DynamicDomainMigrationPostgresTest test
```

## Main relationships

- `users` 1:N `orders` as client; optional assigned editor on each order.
- `services` 1:N `service_packages`; an order references the selected catalog records and stores the server-selected budget.
- `orders` 1:N `order_requirements`, `order_assignments`, `file_records`, `revision_requests`, `payments`, `order_events`; 1:1 `conversations` and 1:1 `reviews`.
- `conversations` N:M `users` through `conversation_participants`; 1:N `conversation_messages`.
- `conversation_messages` N:M readers through `message_reads`; files can optionally reference a conversation/message.
- `notifications` belong to one user and may reference an order/conversation/payment by entity type and ID.

## Workflow

The allowed state path is explicit and role-checked:

`SUBMITTED -> UNDER_REVIEW -> EDITOR_ASSIGNED -> ACCEPTED -> IN_PROGRESS -> PREVIEW_READY -> APPROVED or REVISION_REQUESTED -> PAYMENT_PENDING -> PAID -> DELIVERED -> COMPLETED`

Admin may reject a submitted/reviewed order. An assigned editor may reject an invitation, after which reassignment is permitted. Assignment acceptance creates the client/editor participants and one order conversation idempotently. Preview-ready requires a stored preview file. Delivery requires a verified paid payment and a stored deliverable. Each transition persists an audit event and applicable user notifications.

## API surface

- Current user: `GET/PUT /api/profile/me`; avatar upload/delete under `/api/profile/me/avatar`.
- Catalog: public `GET /api/services`; ADMIN create/update service/package operations under `/api/services`.
- Orders: `GET/POST /api/orders`, authorized detail/events, and explicit review/assignment/accept/reject/start/progress/preview/revision/approval/delivery/completion/review actions.
- Dashboards: `/api/client/dashboard`, `/api/editor/dashboard`, `/api/admin/dashboard`.
- Conversations: order conversation lookup and paginated message/read operations under `/api/orders/{id}/conversation` and `/api/conversations/{id}`.
- Files: list/upload under `/api/orders/{id}/files`; authorized signed download/delete under `/api/files/{id}`.
- Notifications: paginated current-user list and mark-read under `/api/notifications`.
- Payments: order list/initiation plus ADMIN-only trusted verification under `/api/admin/payments/{id}/verify`.
- Administration: live editor availability/workload and account-role/status management under `/api/admin`.
- Portfolio: public published list; authenticated own list; ADMIN/EDITOR publishing and owner/ADMIN delete.

The retired `/api/auth/login` and `/api/auth/register` paths have no controllers and return 404. Their security/filter bypass exists only to allow MVC to produce that 404; it does not restore credential authentication.

## Local configuration

Copy `.env.example` to an ignored local environment source and provide real values without committing them:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://<host>:5432/postgres?sslmode=require"
$env:SPRING_DATASOURCE_USERNAME="<database-user>"
$env:SPRING_DATASOURCE_PASSWORD="<database-password>"
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
$env:SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>"
$env:APP_ALLOWED_ORIGINS="http://localhost:3000"
```

Set the browser-only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in ignored `.env.local`. Never use a service-role key in a `VITE_*` variable.

Create private `profile-avatars` and `order-files` Storage buckets (or set the corresponding environment variable names). Do not make `order-files` public. Spring creates server-derived object paths and returns short-lived signed URLs.

Start locally:

```powershell
.\mvnw.cmd spring-boot:run
npm run dev
```

The Vite `/api` proxy defaults to `http://localhost:8080`; set `DEV_API_PROXY_TARGET` only when the backend runs elsewhere. Production may set `VITE_API_BASE_URL`.

## Manual acceptance scenario

Use existing temporary Supabase accounts and remove any test business rows afterward through reviewed operations; do not create permanent accounts for this test.

1. Apply the reviewed migrations and create the private buckets.
2. Set one existing `public.users` row to `ADMIN`, one to `EDITOR/ACTIVE`, two to `CLIENT/ACTIVE`, using an authorized administrative/bootstrap operation.
3. Start Spring and Vite, then sign in as client A.
4. Create an order from a live service/package and upload a valid client asset.
5. Sign in as ADMIN, mark the order under review, and assign the editor.
6. Sign in as that editor; verify the invitation, order, permitted client requirements, and uploaded asset appear.
7. Accept the assignment and verify exactly one conversation exists.
8. Exchange messages from editor and client; confirm persistence, unread/read state, and updates without refresh.
9. Sign in as client B and verify client A's order, conversation, and files are absent/403.
10. Upload a preview as editor, mark preview ready, request a revision as client, and confirm both portals refresh.
11. Approve the preview and create a pending payment request. Confirm React cannot mark it paid.
12. Use the ADMIN verification endpoint only as a temporary trusted test adapter; confirm `PAID` is persisted.
13. Upload a deliverable, deliver, download through a fresh signed URL, complete the order, and submit one review.
14. Refresh at each role and confirm persistence. Log out/switch accounts and confirm the previous account's data and Realtime channel are cleared.
15. Inspect the network log: no `POST /api/auth/login`, all Spring protected requests carry the Supabase access token, and subscriptions only deliver RLS-visible rows.

## Known external integration boundary

A real payment-provider checkout/webhook adapter is not configured. The UI therefore collects no card, CVV, UPI, or bank credentials and creates only a `PENDING` server record. Production payment completion must replace the temporary trusted ADMIN verification action with provider-signed webhook verification.

Live Supabase/database/Storage validation still requires deployment secrets and existing role-specific accounts. Automated tests use isolated H2 data and mocked Storage/Auth boundaries; they do not mutate the live project.
