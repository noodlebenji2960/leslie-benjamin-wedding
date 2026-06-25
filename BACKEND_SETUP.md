# Gallery Backend Setup & Deployment Guide

This guide walks you through setting up the real-time gallery backend for the leslie-benjamin-wedding project.

## Architecture

- **Server**: Express + MongoDB (Atlas) for metadata, sessions, reactions, admin auth
- **Image storage**: AWS S3 (originals + thumbnails) — the server never writes images to local disk
- **Realtime**: Server-Sent Events (`/events`) for live gallery updates

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
# Install client dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### 2. Start Development Environment

Run both client and server together:

```bash
npm run dev:full
```

Or run them separately in different terminals:

```bash
# Terminal 1: Client (port 5173)
npm run dev

# Terminal 2: Server (port 3001)
npm run server:dev
```

The gallery should be accessible at `http://localhost:5173` with the backend on `http://localhost:3001`.

The server needs a `server/.env.development` file (see `server/.env.example`) with MongoDB, S3, and Resend credentials filled in.

## Deployment to Fly.io

### Prerequisites

1. Create a [Fly.io account](https://fly.io/app/sign-up)
2. Create a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
3. Create an AWS S3 bucket (see "S3 Setup" below)
4. Create a [Resend](https://resend.com) account for the admin OTP password-reset email
5. Install the [Fly CLI](https://fly.io/docs/getting-started/installing-flyctl/)
6. Authenticate:
   ```bash
   fly auth login
   ```

### MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a free cluster (M0 tier)
3. Create a database user:
   - Go to Database Access
   - Add a user with read/write permissions
4. Configure network access:
   - Go to Network Access
   - Add IP address `0.0.0.0/0` — Fly.io machines don't have static IPs, so the whole range must be allowed. Security relies on the connection string credentials.
5. Get your connection string:
   - Click "Connect" > "Connect your application"
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/wedding-gallery?retryWrites=true&w=majority`

### S3 Setup

1. Create an S3 bucket (e.g. `leslie-benjamin-wedding-photos`) in your preferred region
2. Disable "Block all public access" on the bucket
3. Add a bucket policy granting public `s3:GetObject` on the `uploads/*` prefix only (not the whole bucket)
4. Create an IAM user scoped to just this bucket with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`, `s3:HeadBucket` — do not use root or admin credentials for the running app
5. Generate an access key for that IAM user

### Step 1: Deploy from the `server/` directory

All Fly.io commands run from `server/`, not the repo root — that's where `fly.toml` and the `Dockerfile` live:

```bash
cd server
fly apps create leslie-benjamin-wedding-api
```

### Step 2: Set Environment Variables

No persistent volume is needed — images go to S3, not local disk.

```bash
fly secrets set \
  CLIENT_URL=https://www.leslie-and-benjamin.es \
  SERVER_URL=https://leslie-benjamin-wedding-api.fly.dev \
  MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/wedding-gallery?retryWrites=true&w=majority \
  ADMIN_PASSWORD=<choose a strong password> \
  SESSION_SECRET=$(openssl rand -hex 32) \
  RESEND_API_KEY=<your resend api key> \
  ADMIN_RESET_EMAIL=<email to receive OTP resets> \
  EMAIL_FROM=noreply@leslie-and-benjamin.es \
  AWS_REGION=eu-west-3 \
  AWS_ACCESS_KEY_ID=<scoped IAM access key> \
  AWS_SECRET_ACCESS_KEY=<scoped IAM secret key> \
  S3_BUCKET_NAME=leslie-benjamin-wedding-photos
```

### Step 3: Deploy

```bash
fly deploy --remote-only
```

### Step 4: Verify Deployment

```bash
fly logs
curl https://leslie-benjamin-wedding-api.fly.dev/health
fly status
```

`/health` should report `db: connected` and `s3Reachable: true`.

## Frontend Configuration

The production build needs `VITE_API_BASE_URL` set to the deployed backend URL. This is set in `.github/workflows/deploy-pages.yml` (not a secret — it's a public URL), so a normal push to `main` picks it up automatically. For local builds:

```
VITE_API_BASE_URL=https://leslie-benjamin-wedding-api.fly.dev
```

## File Structure

```
leslie-benjamin-wedding/
├── app/                          # React client
│   ├── components/
│   │   └── gallery/
│   │       ├── GalleryGrid.tsx
│   │       └── UploadButton.tsx
│   └── hooks/
│       ├── useImageUpload.ts     # Calls POST /upload
│       └── useSSE.ts             # Listens to GET /events
├── server/                        # Express backend
│   ├── src/
│   │   ├── server.ts             # Entry point
│   │   ├── app.ts                # Express app, routes
│   │   ├── admin.ts              # Admin auth + management API
│   │   ├── db.ts                 # MongoDB/Mongoose wrapper
│   │   ├── models.ts             # Mongoose schemas
│   │   ├── s3.ts                 # S3 upload/delete/stream
│   │   ├── imageProcessor.ts     # Image resize/optimize (in-memory)
│   │   └── types.ts
│   ├── admin/                    # Static admin UI (HTML/CSS/JS)
│   ├── Dockerfile
│   └── fly.toml
└── .github/workflows/deploy-pages.yml  # Frontend deploy (GitHub Pages)
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/gallery` | GET | Fetch paginated images |
| `/upload` | POST | Upload new image |
| `/events` | GET | SSE for real-time updates |
| `/react` | POST | Add/change a reaction on an image |
| `/reactions/:imageId` | GET | Reaction details for one image |
| `/config` | GET | Reaction emoji config, upload limits |
| `/health` | GET | Health check (Mongo + S3 status) |
| `/admin/*` | — | Admin auth + image/reaction management (see `server/src/admin.ts`) |

## Image Storage

Images are uploaded to S3, never written to local disk:
- Original: optimized JPEG, max 2000x2000px
- Thumbnail: 400x400px square JPEG
- Both stored under `uploads/` in the bucket, keyed by `<uuid>.jpg` / `<uuid>-thumb.jpg`
- Admin delete/delete-all remove both objects from S3; admin zip-download streams them directly from S3

## Monitoring & Logs

```bash
fly logs -a leslie-benjamin-wedding-api
fly status -a leslie-benjamin-wedding-api
fly ssh console -a leslie-benjamin-wedding-api
```

## Rollback

```bash
fly releases -a leslie-benjamin-wedding-api
fly releases rollback -a leslie-benjamin-wedding-api
```

## Troubleshooting

### MongoDB Connection Error
1. Verify `MONGODB_URI` secret: `fly secrets list`
2. Check MongoDB Atlas Network Access allows `0.0.0.0/0` (Fly machines have no static IP)
3. Check `fly logs` for the exact Mongoose error

### S3 Errors (AccessDenied, etc.)
1. Confirm the IAM user's policy includes `PutObject`, `GetObject`, `DeleteObject`, `ListBucket`, `HeadBucket` on the bucket
2. Check `/health`'s `s3Reachable` field
3. Check `AWS_REGION` and `S3_BUCKET_NAME` secrets match the actual bucket

### CORS Errors
`CLIENT_URL` must exactly match the frontend's origin (scheme + host, no trailing slash).

## Local Production Testing

```bash
cd server
docker build -t wedding-server .
docker run -p 3001:3001 --env-file .env.development wedding-server
```

## Next Steps

1. Deploy backend: `cd server && fly deploy --remote-only`
2. Set `gallery.enabled` (and any other feature flags) in `app/data/feature-config.json`
3. Push to `main` to deploy the frontend via GitHub Pages
4. Test uploads end-to-end against the live URL
