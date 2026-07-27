# VALKYRIAS fixes — 27 July 2026

- Replaced unsafe direct `.toLowerCase()` usage with null-safe text helpers.
- Fixed Google OAuth callback state, selected-role restoration and post-login portal routing.
- Added a dedicated debounced render-progress update path with an operational range slider.
- Loaded public portfolio items for logged-out landing-page visitors and publishes existing administrator portfolio rows through the migration.
- Added portfolio image upload from the administrator's computer, compressed to WebP before saving.
- Added portfolio metadata and delete controls.
- Added a complete administrator user list and deletion of another administrator while protecting self-deletion and the last active administrator.
- Added editable global footer, contact, social and legal settings.
- Made footer website, mail, phone, Instagram, Vimeo, YouTube, Privacy Policy and Terms links functional.
- Added Terms and Privacy acceptance before password, sign-up and Google authentication.
- Added administrator-created custom-name packages and corrected custom-price rendering.
- Added the required PostgreSQL/Supabase migration and backend endpoints.

- Replaced the shortened fallback Terms and Conditions with the complete 25-section text supplied by the owner.
- Made the Spring Boot server honor Render's `PORT` environment variable while retaining port 8080 locally.
