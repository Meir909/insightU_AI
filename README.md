# InsightU AI

`InsightU AI` — это AI-система для отбора кандидатов в `inVision U`, где искусственный интеллект помогает собирать, структурировать и объяснять оценку кандидата, а финальное решение всегда остаётся за комиссией.

Этот репозиторий отражает `первый этап проекта`, который мы показываем жюри.

## Что уже реализовано

В первом этапе мы собрали рабочий продуктовый прототип:

- `web chat agent` вместо Telegram-бота
- `admin dashboard` для комиссии
- `multimodal interview flow`: текст, `audio`, `video`, документы
- `AI scoring hook` после каждого ответа кандидата
- `explainability` для комиссии: почему кандидат получил конкретные оценки
- `anti-corruption workflow`: один член комиссии не может единолично принять кандидата
- `committee voting`: для положительного решения требуется минимум `3` независимых одобрения
- `persistent storage` для кандидатов, сообщений, evaluation sessions, артефактов и голосов
- интеграция с `Supabase` как финальной БД и storage

## Что умеет система сейчас

### Для кандидата

- регистрация через встроенную форму
- прохождение интервью в формате AI-чата
- ответы текстом
- загрузка `voice`, `video`, `document`
- сохранение истории сессии
- накопление промежуточной оценки по мере прохождения интервью

### Для комиссии

- просмотр dashboard с кандидатами
- просмотр профиля кандидата
- просмотр score breakdown
- просмотр explainability и evidence
- просмотр артефактов кандидата
- голосование комиссии: `approve`, `hold`, `reject`
- защита от одиночного принятия кандидата

## Ключевая логика продукта

### 1. Кандидат проходит интервью

Кандидат заходит на сайт, регистрируется и попадает в `web chat agent`.

Во время интервью он может:

- отвечать на вопросы текстом
- прикладывать голосовые ответы
- прикладывать видеоответы
- прикладывать документы и дополнительные материалы

### 2. Система собирает evaluation session

Во время интервью система сохраняет:

- профиль кандидата
- историю сообщений
- промежуточные score
- артефакты
- статус интервью
- phase/progress

### 3. AI строит оценку

После каждого ответа кандидата система обновляет:

- `cognitive`
- `leadership`
- `growth`
- `decision`
- `motivation`
- `authenticity`
- `confidence`
- `AI risk`

### 4. Комиссия принимает финальное решение

ИИ не принимает кандидата автоматически.

Он только:

- собирает сигналы
- строит оценку
- даёт объяснение
- показывает recommendation

Финальное решение остаётся за комиссией.

### 5. Антикоррупционная защита

В системе встроено правило:

- один член комиссии не может единолично провести кандидата
- для положительного решения требуется минимум `3` независимых одобрения
- если голосов недостаточно или мнения расходятся, кейс остаётся в review / escalation

## Архитектура первого этапа

Проект сейчас собран как единое `Next.js` приложение:

- `frontend` интерфейс
- `App Router API routes`
- `AI chat orchestration`
- `scoring logic`
- `committee workflow`
- `Supabase` persistence layer

Основные части:

- `/sign-in` — вход кандидата и комиссии
- `/interview` — AI-интервью кандидата
- `/dashboard` — панель комиссии
- `/dashboard/candidates/[id]` — детальная карточка кандидата
- `/dashboard/shortlist` — shortlist
- `/dashboard/analytics` — аналитика

## Используемый стек

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Supabase`
- `OpenAI` для adaptive interviewer
- `Recharts`
- `Framer Motion`

## Что именно сделано в рамках этапа 1

### Продуктовая часть

- удалён Telegram-бот
- создан `web chat agent`
- добавлена мультимодальная подача кандидата
- добавлена explainability-логика для комиссии
- добавлено голосование комиссии
- добавлена anti-corruption логика

### Техническая часть

- реализована встроенная авторизация без `Clerk`
- добавлен persistence-слой
- добавлен `Supabase` store
- добавлен fallback store для локальной разработки
- загрузка файлов теперь сохраняется не только в UI, но и в storage
- dashboard теперь может работать не только от mock data, но и от persistence слоя

## Структура данных, которые теперь хранятся

Система сохраняет:

- `candidates`
- `evaluation_sessions`
- `committee_members`
- `committee_votes`
- `artifacts`
- `messages`
- `score_update`

## Запуск локально

Установка:

```bash
npm install
```

Локальный запуск:

```bash
npm run dev
```

Открыть:

```text
http://localhost:3001
```

## Проверка проекта

```bash
npm run lint
npm run build
```

## Переменные окружения

Создай локальный файл:

```bash
cp .env.example .env.local
```

Минимально нужны:

```env
OPENAI_API_KEY=
COMMITTEE_ACCESS_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=candidate-artifacts
```

### Что означает каждая переменная

- `OPENAI_API_KEY` — ключ для adaptive AI interviewer
- `COMMITTEE_ACCESS_KEY` — секретный ключ доступа для членов комиссии
- `SUPABASE_URL` — URL проекта Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — серверный ключ Supabase
- `SUPABASE_STORAGE_BUCKET` — bucket для хранения артефактов кандидатов

## Как подключить Supabase

1. Создать проект в `Supabase`
2. Выполнить SQL из файла [supabase/schema.sql](/c:/Users/nurmi/OneDrive/Desktop/decentrathon/insightu-frontend/supabase/schema.sql)
3. Заполнить `.env.local`
4. Запустить проект

Если `Supabase` не настроен, проект остаётся работоспособным через локальный fallback store для разработки.

## Что показать жюри на демо

Рекомендуемый сценарий демонстрации:

1. Открыть `/sign-in`
2. Войти как кандидат
3. Перейти в `/interview`
4. Отправить текстовый ответ
5. Загрузить `audio` / `video` / `document`
6. Показать, как обновляется score и progress
7. Войти как комиссия
8. Открыть `/dashboard`
9. Открыть карточку кандидата
10. Показать explainability
11. Показать voting flow комиссии
12. Показать правило `3 approvals required`

## Ограничения текущего этапа

На первом этапе у нас уже есть рабочая архитектура и продуктовый прототип, но пока ещё не реализованы:

- полноценный production-grade multimodal analysis для видео и аудио
- отдельный обученный ансамбль моделей уровня `XGBoost + feature pipeline`
- продвинутый `ASR/video behavior analysis`
- production-ready object lifecycle и moderation pipeline

Сейчас это уже сильный рабочий foundation, на который можно ставить следующий этап.

## Следующий этап

Следующим этапом мы планируем:

- вынести оценивание в более продвинутый multimodal pipeline
- добавить feature extraction для `audio/video/text`
- добавить ансамбль моделей для более устойчивого scoring
- усилить explainability для комиссии
- доработать fairness и manual review workflow

## Итог

На конец первого этапа у нас уже есть:

- рабочий `web chat agent`
- рабочий `dashboard` комиссии
- сохранение кандидатов и evaluation sessions
- загрузка и хранение артефактов
- scoring и explainability foundation
- anti-corruption committee logic
- интеграция с `Supabase` как финальной БД

То есть это уже не просто концепт, а полноценный рабочий прототип системы отбора кандидатов для `inVision U`.
