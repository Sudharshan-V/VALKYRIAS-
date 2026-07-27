# VALKYRIAS Cleanup Report

## Removed from the source repository

- `.agents/`
- `.codex/`
- `.github/modernize/`
- `.vscode/` because it contained only personal Java editor settings
- `assets/.aistudio/`
- obsolete Gemini/AI Studio metadata
- old component backup copies
- verified-unused React hooks
- verified-unused legacy Spring service classes with no references
- verified-unused frontend API wrappers
- unused direct npm dependencies and their unreachable lockfile entries

## Excluded from the clean distribution ZIP

- `.git/`
- `.env.local` and all real local secrets
- `node_modules/`
- `target/`
- `dist/`
- `coverage/`
- caches, logs, archives, temporary files, and backup folders

## Intentionally retained

- `.mvn/`, `mvnw`, and `mvnw.cmd`
- `package-lock.json`
- database migrations and schema files
- Spring controllers, repositories, entities, DTOs, and security classes that remain referenced
- guarded administrative and migration scripts
- architecture and operational documentation
- `.env.example` with placeholders only

## New shared code

- `ValkyriasLoader` for branded loading states
- `MediaThumbnail` for safe thumbnail rendering
- `ProfileAvatar` for synchronized profile images and initials fallback
- `useContainedAutoScroll` for chat-only scrolling
- `scripts/clean.mjs` for generated-output cleanup

## Security notes

- No `.env.local` file is included in the clean ZIP.
- No service-role key, database password, or payment secret should be committed.
- The Supabase service-role key must remain backend-only.
- The current payment implementation is not a completed Razorpay integration and is documented as such.
