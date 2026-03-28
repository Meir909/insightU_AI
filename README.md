# InsightU AI

Web-based candidate evaluation system for inVision U.

## Product Modes

- `dashboard` for the commission
- `web chat agent` for candidate interaction
- `Next.js API routes` for interview orchestration and scoring

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `framer-motion`
- `recharts`
- `OpenAI` optional for adaptive questions

## Implemented

- admin dashboard with candidate ranking and analytics
- web chat interviewer at `/interview`
- session-based message history
- scoring hook after each candidate answer
- typing state and progress sidebar
- consistent design with the existing dashboard

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

## Environment

Use `.env.example` as the base:

```bash
cp .env.example .env.local
```

Variables:

- `NEXT_PUBLIC_API_BASE_URL` for optional external ranking source
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for auth
- `OPENAI_API_KEY` for adaptive interviewer behavior

## Notes

- Telegram bot was removed in favor of an in-app chat agent.
- Interview sessions are stored in server runtime memory.
- Without `OPENAI_API_KEY`, the interviewer uses a deterministic fallback question strategy.
- Dashboard fallback data remains intact, so the admin UI does not break.
