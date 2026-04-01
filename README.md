# Decentrathon InsightU AI

Monorepo with three separated services:

- `insightu-frontend` - Next.js dashboard for the commission
- `insightu-backend` - FastAPI scoring and candidate API
- `insightu-bot` - Telegram intake bot

## Architecture

- `frontend` consumes backend ranking, candidate and fairness endpoints
- `telegram bot` collects applications, asks consent, stores progress and submits to backend
- `backend` persists to `Supabase` when configured and falls back to local demo mode otherwise
- recommendations stay explainable and non-final by design

## Run order

1. Start `insightu-backend`
2. Start `insightu-bot`
3. Start `insightu-frontend`

## Compliance baseline

- no autonomous admission decisions
- no demographic or socio-economic scoring signals
- human-in-the-loop required
- explainability preserved in outputs
- privacy and consent handled explicitly before application processing
