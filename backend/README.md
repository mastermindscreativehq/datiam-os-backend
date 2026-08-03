# DATIAM OS — Backend

Artist Business Operating System. Label-level infrastructure for independent artists.

## Stack

- Node.js + TypeScript
- Express.js
- Supabase PostgreSQL
- Drizzle ORM
- Zod validation
- JWT auth
- BullMQ + Redis (optional)
- Railway-ready

---

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once provisioned, go to **Settings → Database**.
3. Copy the **Connection string (URI)** — use the **Direct connection** (not pooler) for migrations.
   Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
4. Go to **Settings → API** and copy the **Service Role Key**.

---

## 2. Environment Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL=postgresql://postgres:your_password@db.xxxx.supabase.co:5432/postgres
JWT_SECRET=your-minimum-32-character-secret-key
```

All other variables are optional for basic operation.

---

## 3. Install Dependencies

```bash
cd backend
npm install
```

---

## 4. Database Migration

Generate and push the schema to Supabase:

```bash
# Option A — push schema directly (fastest for development)
npm run db:push

# Option B — generate migration files, then apply
npm run db:generate
npm run db:migrate
```

---

## 5. Seed Database

Creates one admin user and one DATIAM artist profile:

```bash
npm run db:seed
```

Default credentials come from your `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD` —
see `.env.example`). Never commit or document the real values here.

---

## 6. Run Development Server

```bash
npm run dev
```

Server starts on `http://localhost:4000`

---

## 7. Build for Production

```bash
npm run build
npm start
```

---

## Railway Deployment

1. Connect your GitHub repo to Railway.
2. Set the root directory to `/backend`.
3. Add all env vars from `.env.example` in Railway's variable panel.
4. Railway auto-detects `package.json` and runs `npm run build` + `npm start`.
5. Run migrations once after first deploy:
   ```bash
   # From local with production DATABASE_URL
   DATABASE_URL=<prod_url> npm run db:push
   ```

---

## API Routes

### Auth
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | JWT |

### Artist
| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/artist/profile` | JWT |
| POST | `/api/artist/profile` | JWT |
| PATCH | `/api/artist/profile/:id` | JWT |

### Catalog (Songs)
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/songs` | JWT |
| GET | `/api/songs` | JWT |
| GET | `/api/songs/:id` | JWT |
| PATCH | `/api/songs/:id` | JWT |
| DELETE | `/api/songs/:id` | JWT |
| POST | `/api/songs/:id/assets` | JWT |
| GET | `/api/songs/:id/assets` | JWT |
| POST | `/api/songs/:id/contributors` | JWT |
| GET | `/api/songs/:id/contributors` | JWT |

### Releases
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/releases` | JWT |
| GET | `/api/releases` | JWT |
| GET | `/api/releases/:id` | JWT |
| PATCH | `/api/releases/:id` | JWT |
| POST | `/api/releases/:id/tasks` | JWT |
| GET | `/api/releases/:id/tasks` | JWT |
| PATCH | `/api/release-tasks/:id` | JWT |

### Royalties
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/royalties` | JWT |
| GET | `/api/royalties` | JWT |
| GET | `/api/royalties/song/:songId` | JWT |

### Sync
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/sync/pitches` | JWT |
| GET | `/api/sync/pitches` | JWT |
| PATCH | `/api/sync/pitches/:id` | JWT |

### Fans
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/fans` | JWT |
| GET | `/api/fans` | JWT |
| GET | `/api/fans/:id` | JWT |
| POST | `/api/fans/:id/events` | JWT |

### Content
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/content/ideas` | JWT |
| GET | `/api/content/ideas` | JWT |
| PATCH | `/api/content/ideas/:id` | JWT |

### CRM
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/crm/contacts` | JWT |
| GET | `/api/crm/contacts` | JWT |
| PATCH | `/api/crm/contacts/:id` | JWT |

### Automation
| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/automation/webhook` | Secret header |
| GET | `/api/automation/runs` | JWT |

### Dashboard
| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/dashboard/overview` | JWT |

---

## Test API Calls (curl)

```bash
BASE=http://localhost:4000

# Register
curl -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@datiam.com","password":"password123","full_name":"Test User"}'

# Login (use your actual ADMIN_EMAIL / ADMIN_PASSWORD from .env)
curl -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@datiam.com","password":"your-admin-password"}'

# Get profile (replace TOKEN)
curl $BASE/api/artist/profile \
  -H "Authorization: Bearer TOKEN"

# Dashboard overview
curl $BASE/api/dashboard/overview \
  -H "Authorization: Bearer TOKEN"

# Create a song (replace ARTIST_ID with id from artist profile)
curl -X POST $BASE/api/songs \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"artist_id":"ARTIST_ID","title":"My First Track","genre":"Afrobeats","sync_ready":true}'

# n8n webhook (no JWT required, uses secret header)
curl -X POST $BASE/api/automation/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-n8n-webhook-secret" \
  -d '{"workflow_name":"release_notification","payload":{"event":"pre_save_hit"}}'
```

---

## Drizzle Studio (DB GUI)

```bash
npm run db:studio
```

Opens a browser-based database explorer at `https://local.drizzle.studio`.
