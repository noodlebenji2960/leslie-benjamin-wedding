# Quick Start — Gallery Backend

## What's Built

- **Express + MongoDB** backend (`server/`) for image metadata, reactions, sessions, admin auth
- **AWS S3** for image storage (originals + thumbnails) — no local disk, no SQLite
- **Server-Sent Events** (`/events`) for real-time gallery updates
- **Admin panel** (`server/admin/`) for moderating uploads, toggling features, password reset via emailed OTP

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for full deployment instructions and [server/README.md](server/README.md) for API details.

## Local Development

### 1. Install dependencies
```bash
npm install
cd server && npm install && cd ..
```

### 2. Configure the server
Copy `server/.env.example` to `server/.env.development` and fill in:
- `MONGODB_URI` (MongoDB Atlas connection string)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- `ADMIN_PASSWORD`, `SESSION_SECRET`
- `RESEND_API_KEY`, `ADMIN_RESET_EMAIL`, `EMAIL_FROM` (for the admin OTP password reset email)

### 3. Run client and server (two terminals)
```bash
# Terminal 1 — client (port 5173)
npm run dev

# Terminal 2 — server (port 3001)
cd server && npm run dev
```

### 4. Test it
- Open http://localhost:5173, navigate to the gallery, upload a photo
- Admin panel: http://localhost:3001/admin/

## Key Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| repo root | `npm run dev` | Start the frontend dev server |
| repo root | `npm run build` | Build frontend for production (runs tests first) |
| `server/` | `npm run dev` | Start backend with `tsx` (no auto-reload — restart manually after edits) |
| `server/` | `npm run build` | Compile backend TypeScript |
| `server/` | `npm run typecheck` | Type-check backend only |

## Deploying

- **Backend**: `cd server && fly deploy --remote-only` — see [BACKEND_SETUP.md](BACKEND_SETUP.md) for secrets setup
- **Frontend**: push to `main` — `.github/workflows/deploy-pages.yml` builds and publishes to GitHub Pages automatically

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/gallery` | GET | Paginated image list |
| `/upload` | POST | Upload an image (multipart) |
| `/events` | GET | SSE stream for live updates |
| `/react` | POST | Add/change a reaction |
| `/reactions/:imageId` | GET | Reaction details for one image |
| `/config` | GET | Reaction emoji groups, upload limits |
| `/health` | GET | Mongo + S3 connectivity status |
| `/admin/*` | — | Admin auth, image/reaction moderation, zip export |

## Image Processing

- Original: resized to max 2000×2000px, JPEG quality 85
- Thumbnail: 400×400px square crop, JPEG quality 75
- Both uploaded to S3 under `uploads/` — never written to local disk
- Accepted input formats: JPEG, PNG, WebP, GIF (validated by magic bytes, not just declared MIME type)
- Max upload size: 10MB (`MAX_FILE_SIZE` env var)

**Logs:**
```bash
# Local
cd server && npm run dev

# Production
fly logs -a leslie-benjamin-wedding-api
```
