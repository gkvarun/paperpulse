# PaperPulse Cloudflare API starter

This Worker uses Cloudflare D1. It includes password-based registration/login, revocable bearer sessions, subject/topic and rights-filtered resource catalogue endpoints, saved resources, practice attempts, discussion/reply endpoints, and a moderator/admin overview endpoint.

## Deploy

1. Install Node.js 20+ and Wrangler (`npm i -g wrangler`), then authenticate with `wrangler login`.
2. From the `cloudflare` directory, copy `wrangler.toml.example` to `wrangler.toml`, create a D1 database with `wrangler d1 create paperpulse-db`, and paste the returned database ID into the config.
3. Apply schema: `wrangler d1 execute paperpulse-db --remote --file=./schema.sql`.
4. Set `ALLOWED_ORIGINS` to the exact comma-separated frontend origins. Never use `*` for a credentialed app.
5. Deploy from this directory: `wrangler deploy`.
6. Verify `GET /api/health`, then configure the frontend API base URL when integrating the client.

## API routes

- `POST /api/auth/register` — `{ "email", "display_name", "password" }`; minimum password length 10.
- `POST /api/auth/login` — `{ "email", "password" }`.
- `POST /api/auth/logout` — authenticated bearer token.
- `GET /api/auth/me` — authenticated profile.
- `GET /api/subjects`, `GET /api/topics?subject_id=...`.
- `GET /api/resources?qualification=...&resource_type=...&exam_year=...&subject_id=...` — returns only published, rights-cleared resources.
- `GET/POST /api/attempts` — own attempt history / create a score record.
- `GET/POST /api/saved`, `DELETE /api/saved/:resourceId`.
- `GET/POST /api/discussions`, `GET/POST /api/discussions/:id/replies`.
- `GET /api/admin/overview` — moderator/admin only.

## Important launch work still required

- Configure Cloudflare rate limiting for registration/login and community write routes; add email verification, password reset, abuse detection and alerting.
- The API returns opaque bearer tokens. The client should keep them in memory or session storage, never log them, and clear them on logout. Consider a same-site secure cookie/BFF architecture for a public production launch.
- Admin/moderator role assignment must be done by a trusted operator directly in D1; never add a public role-selection field to registration.
- Add report creation and moderation queue actions before opening community posting to minors. Establish age-appropriate safety policies, reporting, blocking, retention/deletion workflows and support contacts.
- `source_url` should only point to resources PaperPulse has permission to link to; R2 files should only be uploaded when distribution rights are documented. New resources default to `unverified` and unpublished.
- This starter does not include OAuth, email verification, password reset, file upload/signing, full admin editing or a production security audit.
