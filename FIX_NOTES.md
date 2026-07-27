# VALKYRIAS Portal Stability and Clean-Code Fixes

## Automatic scrolling

- Removed page-level `scrollIntoView()` effects from Customer, Editor, and Laura message updates.
- Added a contained message-scroll hook that moves only the relevant chat container.
- Prevented background realtime refreshes from replacing an already-loaded portal with a full-page loader.
- Debounced editor progress updates so dragging the slider does not submit a request for every pointer movement.
- Preserved the current browser position during profile saves, avatar uploads, file activity, progress updates, and realtime refreshes.

## Landing page and session routing

- The normal entry view is the landing page.
- A remembered session hydrates the profile without automatically replacing the landing page with a portal.
- The landing Portal button shows the authenticated user’s profile photo and display name.
- Clicking the authenticated identity opens the portal authorized by the backend role.
- Password-recovery links remain routed to the reset-password screen.

## Profiles and avatars

- Shared profile updates refresh the central profile cache used by every portal.
- Editor role-specific details continue to use the backend editor-profile record.
- Avatar upload and deletion update the portal header, My Profile area, checkout identity, and landing identity.
- Added reusable avatar fallback handling for missing, stale, or unavailable signed URLs.

## Thumbnails

- Image order files receive authorized signed URLs during dashboard hydration.
- Added reusable thumbnail error handling for project, portfolio, asset, and deliverable cards.
- Cards show a clean VALKYRIAS/project fallback instead of the browser’s broken-image icon.

## Loading design

- Added one reusable VALKYRIAS loader with a gold shimmer-sweeper animation.
- Replaced generic spinner and AI-Studio-style loading states across authentication, intro, dashboards, checkout, profile save, avatar operations, file upload, notes, and Laura.

## Laura portal guide

- Replaced the narrow canned response flow with role-aware guidance based on published services and packages.
- Added immediate topic continuity for follow-up questions such as “tell me more” and “what next”.
- Added safe guidance for orders, uploads, previews, revisions, profiles, support, payment status, and final delivery.
- Laura does not claim to complete actions and does not request payment credentials.
- Laura’s message area scrolls internally without moving the page.

## Code and repository cleanup

- Removed verified-unused React hooks, legacy service classes, API wrapper functions, backup TSX copies, AI-assistant workspaces, editor-only settings, and obsolete metadata.
- Removed direct unused npm dependencies, including the unused Google GenAI client and local Express tooling.
- Added stricter TypeScript unused-code and casing checks.
- Added a cross-platform clean script.
- Preserved migrations, wrappers, architecture documents, protected maintenance scripts, and backend classes that remain referenced or can affect persisted data.

## Validation performed

- `npm run lint` passed using `tsc --noEmit` with unused-code checks enabled.
- `git diff --check` passed.
- Direct image rendering is now limited to the reusable safe media/avatar components.
- Remaining `scrollIntoView()` calls are explicit Admin navigation actions initiated by button clicks, not automatic effects.
- A full Vite build could not run in the Linux repair container because the uploaded Windows dependency folder lacks Rollup’s Linux native optional binary. Run `npm install` on Windows before `npm run build`.
- Maven compilation could not complete in the offline repair container because the wrapper needed repository access. Start the backend locally to complete Java runtime verification.
