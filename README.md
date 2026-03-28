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

Open `http://localhost:3000`.

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

## Notes

- Without external keys and backend URLs the app falls back to mock data automatically.
- `middleware.ts`, `ClerkProvider`, `service-status` API and data client are already wired for real integrations.
