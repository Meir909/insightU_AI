# InsightU Backend

Отдельный backend-сервис для `InsightU AI` на `FastAPI`.

## Что делает

- аккаунты кандидатов и комиссии
- логин и регистрация
- интервью-сессии
- сообщения и артефакты
- скоринг и explainability snapshot
- голосование комиссии
- аналитика по пулу кандидатов

## Запуск

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## ENV

Скопируй:

```bash
copy .env.example .env
```

Минимум:

```env
COMMITTEE_ACCESS_KEY=committee-demo
ALLOW_LOCAL_STORE=true
```
