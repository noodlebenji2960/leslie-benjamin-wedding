# Gallery Backend

Express + MongoDB API for the wedding photo gallery. Image bytes live in S3; MongoDB stores metadata, reactions, visitor tracking, and admin auth state.

See [../BACKEND_SETUP.md](../BACKEND_SETUP.md) for full deployment instructions.

## Stack

- **Express 4** — HTTP server
- **MongoDB / Mongoose** — `Image`, `Visitor`, `Reaction`, `AdminAuth` collections
- **AWS S3** (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`) — original + thumbnail storage
- **Sharp** — in-memory image resize/optimize (no temp files on disk)
- **express-session** — admin login session (in-memory `MemoryStore` — fine for a single Fly machine, not for horizontal scaling)
- **Resend** — admin password-reset OTP email
- **archiver** — streams S3 objects into a zip for the admin "download all" feature

## Local Development

```bash
npm install
cp .env.example .env.development   # fill in real values
npm run dev
```

Runs on `http://localhost:3001`. `npm run dev` uses `tsx` without watch mode — restart manually after editing source files.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | no (default `3001`) | HTTP port |
| `NODE_ENV` | no | `development` / `production` |
| `CLIENT_URL` | yes | Exact frontend origin allowed by CORS |
| `SERVER_URL` | no | Used in logging only |
| `MAX_FILE_SIZE` | no (default `10485760`) | Max upload size in bytes |
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `ADMIN_PASSWORD` | yes (until overridden) | Fallback admin password — overridden once a password is set via the admin UI (stored as a bcrypt hash in `AdminAuth`) |
| `SESSION_SECRET` | yes | Express session signing secret — use a long random value in production |
| `RESEND_API_KEY` | yes | For the admin forgot-password OTP email |
| `ADMIN_RESET_EMAIL` | yes | Where the OTP email is sent |
| `EMAIL_FROM` | yes | From address for the OTP email (domain must be verified in Resend) |
| `AWS_REGION` | no (default `eu-west-3`) | S3 bucket region |
| `AWS_ACCESS_KEY_ID` | yes | IAM credentials, scoped to the bucket only |
| `AWS_SECRET_ACCESS_KEY` | yes | — |
| `S3_BUCKET_NAME` | yes | Bucket holding `uploads/<uuid>.jpg` and `uploads/<uuid>-thumb.jpg` |
| `CLOUDFRONT_URL` | no | If set, image URLs use this CDN base instead of the raw S3 URL |

## API

### Public

| Method | Path | Notes |
|--------|------|-------|
| GET | `/gallery?cursor=&limit=` | Cursor-paginated image list, max `limit=100` |
| POST | `/upload` | `multipart/form-data`: `file`, `uploaderName?`, `uploaderVisitorId?`. Rate-limited (30/hour/IP). Returns the created `ImageRecord`. |
| GET | `/events` | SSE stream: `connected`, `heartbeat` (20s), `new-image`, `delete-image`, `update-image`, `clear-all`, `reaction` events |
| POST | `/react` | `{ imageId, visitorId, uploaderName, emoji }` — emoji must be in the configured reaction set |
| GET | `/reactions/:imageId` | Per-image reaction breakdown with display names |
| GET | `/config` | Reaction emoji groups, `maxUploadSize`, `maxUploaderNameLength` |
| GET | `/health` | `{ status, db, s3Reachable, timestamp }` |

`/gallery`, `/upload`, `/events`, `/react`, `/reactions/:imageId` all 503 if the corresponding service flag (`galleryApiDisabled` / `uploadsDisabled`) is toggled off from the admin panel.

### Admin (`/admin/*`, session-cookie auth via `requireAuth`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/` | Serves the admin SPA (`admin/index.html`) |
| GET | `/admin/api/check` | Verify the current session is authenticated |
| POST | `/admin/api/login` | `{ password }` — rate-limited (10/15min/IP) |
| POST | `/admin/api/logout` | Destroys the session |
| POST | `/admin/api/forgot-password` | Sends an OTP to `ADMIN_RESET_EMAIL` (3/hour/IP) |
| POST | `/admin/api/reset-password` | `{ otp, newPassword }` — sets a new bcrypt-hashed password override |
| POST | `/admin/api/delete/:id` | Deletes the image from Mongo and both S3 objects |
| POST | `/admin/api/update/:id` | `{ uploaderName }` — rename an upload |
| POST | `/admin/api/delete-all` | Wipes all images (Mongo + S3) and all reactions |
| GET | `/admin/api/service-status` | Current `uploadsDisabled` / `galleryApiDisabled` flags |
| POST | `/admin/api/service/uploads/:state` | `:state` is `on`/`off` |
| POST | `/admin/api/service/gallery/:state` | `:state` is `on`/`off` — also gates uploads when off |
| POST | `/admin/api/reactions/delete/:imageId/:emoji` | Remove all of one emoji on an image |
| POST | `/admin/api/reactions/clear/:imageId` | Remove all reactions on an image |
| POST | `/admin/api/reactions/rename/:imageId/:visitorId` | Override the display name for a visitor's reactions |
| GET | `/admin/download` | Streams a zip of every original image, named `<uploaderName or date>.jpg`, deduplicated if names collide |

## Image Storage

Uploads never touch local disk. `multer.memoryStorage()` holds the upload in memory, `sharp` resizes/re-encodes it to two in-memory JPEG buffers (original ≤2000×2000px @ q85, thumbnail 400×400px @ q75), and both are uploaded directly to S3 under `uploads/<uuid>.jpg` / `uploads/<uuid>-thumb.jpg`. Magic-byte sniffing (not just the declared `Content-Type`) validates the file is actually JPEG/PNG/WebP/GIF before processing.

Admin delete and delete-all remove both S3 objects; the zip-download endpoint streams objects directly from S3 into the response via `archiver`.

## Error Handling

All async route handlers (in both `app.ts` and `admin.ts`) are wrapped in `asyncRoute` (`src/asyncRoute.ts`), which forwards rejected promises to Express's error handler instead of crashing the process. A failure in one request (e.g. a transient S3 or Mongo error) returns a 500 to that request only — it does not take down the server for other users.

## Database

MongoDB collections (see `src/models.ts`):

- **`images`** — `id`, `url`, `thumbnailUrl`, `uploaderName`, `uploadedAt`, `filename`, `fileSize`, `uploaderIp`, `uploaderVisitorId`, `uploaderUserAgent`, `reactions` (Map<emoji, count>). Indexed on `uploadedAt` and `uploaderVisitorId`.
- **`visitors`** — tracks known names/IPs/user-agents/uploads per `visitorId` (a client-generated ID, not derived from auth).
- **`reactions`** — one document per `(imageId, visitorId, emoji)`, unique-indexed to enforce one reaction per emoji per visitor per image.
- **`admin_auth`** — singleton document holding the password hash override, OTP state, and the `uploadsDisabled`/`galleryApiDisabled` service flags.

`uploaderIp`/`uploaderUserAgent` are stored for abuse investigation but are **not** returned by any public endpoint — only `id`, `url`, `thumbnailUrl`, `uploaderName`, `uploadedAt`, `filename`, `fileSize`, `uploaderVisitorId`, and `reactions` are exposed publicly.

## Deployment

```bash
fly deploy --remote-only
```

Runs from this directory (`server/fly.toml`). See [../BACKEND_SETUP.md](../BACKEND_SETUP.md) for secrets setup, MongoDB Atlas network access, and S3 bucket/IAM setup.

## Troubleshooting

- **Mongo connection errors**: Atlas Network Access must allow `0.0.0.0/0` — Fly machines don't have a static IP.
- **S3 `AccessDenied`**: the IAM user needs `PutObject`, `GetObject`, `DeleteObject`, `ListBucket`, `HeadBucket` on the bucket.
- **CORS errors**: `CLIENT_URL` must exactly match the frontend's origin (the CORS middleware checks it directly, not a wildcard).
- **Session not persisting**: sessions are in-memory and per-machine. If `min_machines_running > 1` in `fly.toml`, an admin session can land on either machine and appear logged out — either pin to 1 machine or move to a shared session store if this becomes a problem.
