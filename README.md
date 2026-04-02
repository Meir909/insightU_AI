# InsightU AI

**Decentrathon 5.0 · Трек: AI inDrive**

AI-платформа отбора кандидатов в inVision U.

## Для кого

inVision U — университет от inDrive с 100% грантами для лидеров Казахстана.

Проблема: ручной скрининг не масштабируется, ИИ-эссе размывают подлинный голос кандидата.

Решение: InsightU AI — система, которая помогает комиссии видеть человека, а не заявку.

## Что реализовано

- Web chat agent: адаптивное AI-интервью
- Multimodal: текст, голос, видео, документы
- AI scoring: 6 измерений после каждого ответа
- Explainability: reasoning + key quotes
- Dashboard комиссии: ранжирование, шорт-лист, аналитика
- Anti-corruption: минимум 3 голоса для положительного решения
- Fairness audit: автоматическая проверка предвзятости
- Proactive talents: поиск скрытых талантов

## Стек

- Next.js 15, React 19, TypeScript
- Tailwind CSS 4, Framer Motion
- OpenAI GPT-4o (интервьюер), Whisper-1 (STT)
- Supabase (PostgreSQL + Storage), Prisma ORM
- Vercel (деплой), Recharts (графики)

## AI Pipeline

Final Score = 0.28 NLP + 0.24 Behavioral + 0.22 Cognitive + 0.14 Authenticity + 0.12 Growth

6 измерений: cognitive, leadership, growth, decision, motivation, authenticity

## Запуск

bash
git clone https://github.com/Meir909/insightU_AI.git
cd insightu-frontend
npm install
cp .env.example .env.local
npm run dev

Открыть: http://localhost:3001

## Переменные окружения

OPENAI_API_KEY=sk-...
COMMITTEE_ACCESS_KEY=committee-demo
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=candidate-artifacts
NEXT_PUBLIC_APP_URL=http://localhost:3001

Без Supabase проект работает через встроенный JSON fallback store.

## Демо для жюри

### Кандидат
1. /sign-up — регистрация
2. /apply — анкета (4 шага)
3. /interview — AI-интервью
4. /account — статус заявки

### Комиссия
1. /sign-in с COMMITTEE_ACCESS_KEY
2. /dashboard — пул кандидатов
3. /dashboard/candidates/[id] — профиль с explainability
4. Голосование: approve / hold / reject
5. /dashboard/shortlist — финалисты
6. /dashboard/analytics — fairness-отчёт
7. /dashboard/talents — скрытые таланты

## Соответствие ТЗ

| Требование | Реализация |
|---|---|
| Анализ анкет, текстов и интервью | Мультимодальное AI-интервью + анкета |
| Оценка по навыкам, мотивации, потенциалу | 6 измерений + confidence + AI risk |
| Shortlist | /dashboard/shortlist |
| Explainable AI | reasoning + key quotes для каждого кандидата |
| Human-in-the-loop | AI не принимает решения самостоятельно |
| Fairness | fairness-аудит, bias protection |
| AI Detection | ai_detection_prob на каждый ответ |
| Предиктивная аналитика | PredictivePanel с insights |
| Проактивный поиск | /dashboard/talents — 60+ баллов |
| Антикоррупция | 3 независимых голоса для approval |

## Архитектура

Next.js App Router + API Routes
AI Services: GPT-4o, Whisper, AuthentiScan, LLM Scorer
Persistence: Supabase PostgreSQL + Storage
Деплой: Vercel

## Ограничения

- Видеоанализ через транскрипцию; поведенческий анализ — следующий этап
- Веса ансамбля откалиброваны вручную
- Финальное решение ВСЕГДА за комиссией — архитектурное ограничение

---
InsightU AI — AI помогает, но не решает. Решение за комиссией inVision U.