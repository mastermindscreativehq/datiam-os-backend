# DATIAM OS Frontend

Matrix Intelligence Dashboard — Phase 3

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

## Environment Variables

```
VITE_API_URL=https://datiam-os-backend-production.up.railway.app
```

## Testing Login

1. Start the dev server: `npm run dev`
2. Visit http://localhost:3000/login
3. Enter your operator credentials (email + password configured in the backend)
4. On success the dashboard loads at `/dashboard`
5. Use the DISCONNECT button in the sidebar to log out

## Production Build

```bash
npm run build
npm run preview
```

## Architecture

```
src/
├── api/client.ts          # Axios client with JWT interceptors
├── store/authStore.ts     # Zustand auth state (login, logout, verifyToken)
├── layouts/
│   └── ProtectedLayout.tsx  # Auth guard — redirects to /login if unauthenticated
├── components/
│   ├── Sidebar.tsx        # Fixed navigation sidebar
│   ├── StatCard.tsx       # KPI stat card
│   ├── DataTable.tsx      # Generic data table renderer
│   ├── LoadingSpinner.tsx # Matrix loading indicator
│   └── ErrorMessage.tsx   # Error state with retry
└── pages/
    ├── Login.tsx           # /login
    ├── Dashboard.tsx       # /dashboard — GET /api/dashboard/overview
    ├── FanIntelligence.tsx # /fan-intelligence — summary + top-fans + geography
    ├── Catalog.tsx         # /catalog
    ├── Releases.tsx        # /releases
    ├── SyncPitches.tsx     # /sync-pitches
    ├── RoyaltySources.tsx  # /royalty-sources
    ├── ContentIdeas.tsx    # /content-ideas
    └── AutomationRuns.tsx  # /automation-runs
```
