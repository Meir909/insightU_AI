# InsightU AI Frontend

Admin dashboard prototype for `InsightU AI` built for the `inDrive × inVision U` Decentrathon concept.

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `framer-motion`
- `recharts`
- `@react-three/fiber` / `drei`

## Implemented

- `sign-in` landing screen for committee access
- dashboard overview with KPI cards and candidate table
- candidate detail page with score sphere, confidence, AI detection and explainability
- shortlist page
- analytics page
- responsive mobile bottom navigation
- realistic mock data for 15 anonymized candidates

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3001`.

## Validation

```bash
npm run lint
npm run build
```

Both commands pass in the current workspace state.

## Environment

Use `.env.example` as the base:

```bash
cp .env.example .env.local
```

Important variables:

- `NEXT_PUBLIC_API_BASE_URL` for `FastAPI`
- `NEXT_PUBLIC_WS_URL` for dashboard live updates
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for auth
- `OPENAI_API_KEY`, `POSTGRES_URL`, `REDIS_URL`, `FAISS_API_URL`, `S3_BUCKET_URL` for backend service readiness

## Single Server Deploy

This repository is now prepared for a single-server deployment where one VPS or cloud server runs:

- `frontend` as a `Next.js` service
- `backend` as a `FastAPI` service
- `telegram-bot` as a worker service
- `nginx` as the public reverse proxy

Deployment files:

- [docker-compose.yml](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/docker-compose.yml)
- [Dockerfile.frontend](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/Dockerfile.frontend)
- [backend/Dockerfile](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/backend/Dockerfile)
- [telegram-bot/Dockerfile](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/telegram-bot/Dockerfile)
- [deploy/nginx.conf](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/deploy/nginx.conf)
- [.env.server.example](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/.env.server.example)

Run on server:

```bash
cp .env.server.example .env
docker compose up -d --build
```

Public traffic flow:

- `/` -> frontend
- `/api/v1/*` -> backend
- `telegram-bot` has no public port and works as an internal worker

## Render Deploy

This repository is also prepared for `Render Blueprint` deploys with:

- [render.yaml](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/render.yaml)

Render service layout:

- `insightu-frontend` as a web service
- `insightu-backend` as a web service
- `insightu-telegram-bot` as a background worker

Important Render notes:

- `NEXT_PUBLIC_API_BASE_URL` must be set manually to the public URL of `insightu-backend`
- `CORS_ORIGINS` must include the public URL of `insightu-frontend`
- `BOT_TOKEN`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are secret env vars and must be added manually in Render
- Render Blueprints support `web` and `worker` services via `render.yaml`  
  Source: [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)

## Notes

- Without external keys and backend URLs the app falls back to mock data automatically.
- `proxy.ts`, `ClerkProvider`, `service-status` API and data client are already wired for real integrations.
