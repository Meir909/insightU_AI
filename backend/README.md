# InsightU Backend

FastAPI backend for the `InsightU AI` MVP.

## What it does

- receives candidate/application data
- computes explainable recommendation scores
- avoids demographic scoring signals
- exposes ranking, shortlist, candidate and fairness endpoints
- optionally persists data to `Supabase`
- optionally uses `OpenAI GPT-4o` for adaptive interview follow-ups and richer reasoning

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- If `Supabase` is not configured and `ALLOW_MOCK_STORAGE=true`, the service falls back to in-memory/demo storage.
- The API returns recommendations only. Final admission decisions remain with the commission.
