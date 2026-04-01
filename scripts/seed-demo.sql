-- =============================================================================
-- InsightU AI — Demo Seed Script for Supabase SQL Editor
-- Run this in Supabase → SQL Editor
-- Password for all accounts: Demo1234!
-- =============================================================================

-- Clean up existing demo accounts (safe to re-run)
DELETE FROM sessions WHERE account_id IN (
  SELECT id FROM accounts WHERE phone LIKE '+770112345%'
);
DELETE FROM interview_messages WHERE session_id IN (
  SELECT "interviewSession".id FROM candidates
  JOIN "interviewSession" ON "interviewSession"."candidateId" = candidates.id
  JOIN accounts ON accounts.id = candidates."accountId"
  WHERE accounts.phone LIKE '+770112345%'
);
DELETE FROM candidate_evaluations WHERE "candidateId" IN (
  SELECT candidates.id FROM candidates
  JOIN accounts ON accounts.id = candidates."accountId"
  WHERE accounts.phone LIKE '+770112345%'
);
DELETE FROM interview_sessions WHERE "candidateId" IN (
  SELECT candidates.id FROM candidates
  JOIN accounts ON accounts.id = candidates."accountId"
  WHERE accounts.phone LIKE '+770112345%'
);
DELETE FROM candidates WHERE "accountId" IN (
  SELECT id FROM accounts WHERE phone LIKE '+770112345%'
);
DELETE FROM accounts WHERE phone LIKE '+770112345%';

-- =============================================================================
-- CANDIDATE 1: Айгерим Бекова — Шорт-лист (score: 84)
-- =============================================================================
DO $$
DECLARE
  acc_id  uuid := gen_random_uuid();
  cand_id uuid := gen_random_uuid();
  sess_id uuid := gen_random_uuid();
  iv_id   uuid := gen_random_uuid();
BEGIN
  INSERT INTO accounts (id, role, name, email, phone, "passwordHash", "createdAt", "updatedAt")
  VALUES (acc_id, 'candidate', 'Айгерим Бекова', 'aigrim.bekova@demo.kz', '+77011234501',
    '58b91bd4539fd8a988fd7e72c1134b8f:c6f403e552acfd02058b3d000902768e60462bad622799c626f89635d1fa1df38e9e95a447019aa0b3f93b865c53d0294a32c1edfaab458c34029724f924b63e',
    now(), now());

  INSERT INTO candidates (id, "accountId", code, "fullName", email, phone, city, institution, status,
    goals, experience, "motivationText", "overallScore", "createdAt", "updatedAt")
  VALUES (cand_id, acc_id, 'IU-2401', 'Айгерим Бекова', 'aigrim.bekova@demo.kz', '+77011234501',
    'Алматы', 'Назарбаев Университет', 'shortlisted',
    'Стать социальным предпринимателем и развить сеть экологических коопераций в Казахстане.',
    'Организовала волонтёрский проект по озеленению школ (2 года, 400+ участников). Стипендиат БОЛАШАК.',
    'Хочу системный подход к лидерству и инструменты для масштабирования социальных проектов.',
    84, now(), now());

  INSERT INTO interview_sessions (id, "candidateId", progress, phase, status,
    "cognitiveScore", "leadershipScore", "growthScore", "decisionScore",
    "motivationScore", "authenticityScore", "confidenceScore", "aiRiskScore",
    "createdAt", "updatedAt")
  VALUES (iv_id, cand_id, 100, 'Interview completed', 'completed',
    82, 88, 85, 80, 90, 86, 71, 5, now(), now());

  INSERT INTO sessions (id, "accountId", token, "expiresAt", "createdAt")
  VALUES (sess_id, acc_id, gen_random_uuid()::text, now() + interval '30 days', now());

  INSERT INTO interview_messages (id, "sessionId", role, content, type, "createdAt")
  VALUES
    (gen_random_uuid(), iv_id, 'assistant', 'Здравствуйте. Я AI interviewer InsightU. Расскажите кратко о себе.', 'text', now() - interval '2 hours'),
    (gen_random_uuid(), iv_id, 'user', 'Меня зовут Айгерим. Я выросла в Алматы, в семье учителей. С детства интересовалась экологией и общественными проектами.', 'text', now() - interval '1 hour 55 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Почему вы хотите поступить в inVision U?', 'text', now() - interval '1 hour 50 min'),
    (gen_random_uuid(), iv_id, 'user', 'Хочу получить инструменты системного мышления, чтобы масштабировать свои проекты. inVision U — это среда, где я смогу вырасти как лидер.', 'text', now() - interval '1 hour 45 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Расскажите про ситуацию, где вы взяли инициативу и изменили ход событий.', 'text', now() - interval '1 hour 40 min'),
    (gen_random_uuid(), iv_id, 'user', 'Когда никто не хотел брать ответственность за организацию городского субботника, я составила план на 3 месяца, собрала команду из 40 человек и мы привлекли 3 спонсора.', 'text', now() - interval '1 hour 35 min');

  INSERT INTO candidate_evaluations (id, "candidateId", "problemSolving", "leadershipPotential",
    adaptability, "changeAgentMindset", "softSkills", authenticity, "overallScore",
    confidence, strengths, weaknesses, "redFlags", reasoning, recommendation, "evaluatorType", "createdAt")
  VALUES (gen_random_uuid(), cand_id, 82, 88, 85, 80, 90, 86, 84, 71,
    '["Системное мышление", "Лидерство через действие", "Искренняя мотивация"]'::jsonb,
    '["Недостаточно конкретные метрики результата"]'::jsonb,
    '[]'::jsonb,
    'Кандидат демонстрирует высокий уровень лидерского потенциала и подлинную мотивацию. Ответы конкретны, подкреплены реальными примерами. Рекомендуется к рассмотрению.',
    'Proceed to committee discussion', 'llm_gpt4o', now());
END $$;

-- =============================================================================
-- CANDIDATE 2: Данияр Сейткали — Шорт-лист (score: 78)
-- =============================================================================
DO $$
DECLARE
  acc_id  uuid := gen_random_uuid();
  cand_id uuid := gen_random_uuid();
  sess_id uuid := gen_random_uuid();
  iv_id   uuid := gen_random_uuid();
BEGIN
  INSERT INTO accounts (id, role, name, email, phone, "passwordHash", "createdAt", "updatedAt")
  VALUES (acc_id, 'candidate', 'Данияр Сейткали', 'daniyar.seitqali@demo.kz', '+77011234502',
    '5670209e0f5716566743fc5658b5b419:23a0a599cc7c07d0e7b68ec24a3cf933feaa25d4a1b854a3d99591fbb6d03896b922de7d261f0a954753c9a046bd314f2f07fee12d60a504a10dce5cf1259296',
    now(), now());

  INSERT INTO candidates (id, "accountId", code, "fullName", email, phone, city, institution, status,
    goals, experience, "motivationText", "overallScore", "createdAt", "updatedAt")
  VALUES (cand_id, acc_id, 'IU-2402', 'Данияр Сейткали', 'daniyar.seitqali@demo.kz', '+77011234502',
    'Нур-Султан', 'Евразийский национальный университет', 'shortlisted',
    'Разработать tech-решения для автоматизации сельского хозяйства в регионах Казахстана.',
    'Победитель олимпиад по информатике. Создал мобильное приложение FarmHelper (500+ пользователей, грант МЦРИАП 1.5 млн тенге).',
    'Хочу научиться управлять командами и стратегически думать о бизнесе.',
    78, now(), now());

  INSERT INTO interview_sessions (id, "candidateId", progress, phase, status,
    "cognitiveScore", "leadershipScore", "growthScore", "decisionScore",
    "motivationScore", "authenticityScore", "confidenceScore", "aiRiskScore",
    "createdAt", "updatedAt")
  VALUES (iv_id, cand_id, 100, 'Interview completed', 'completed',
    90, 72, 80, 82, 75, 78, 66, 8, now(), now());

  INSERT INTO sessions (id, "accountId", token, "expiresAt", "createdAt")
  VALUES (sess_id, acc_id, gen_random_uuid()::text, now() + interval '30 days', now());

  INSERT INTO interview_messages (id, "sessionId", role, content, type, "createdAt")
  VALUES
    (gen_random_uuid(), iv_id, 'assistant', 'Здравствуйте. Расскажите о себе и своём пути.', 'text', now() - interval '3 hours'),
    (gen_random_uuid(), iv_id, 'user', 'Данияр, студент ЕНУ. Увлекаюсь программированием с 12 лет. Создал приложение FarmHelper для управления теплицами.', 'text', now() - interval '2 hours 55 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Почему именно inVision U?', 'text', now() - interval '2 hours 50 min'),
    (gen_random_uuid(), iv_id, 'user', 'Хочу научиться не только делать продукт, но и управлять командами и стратегически думать о бизнесе.', 'text', now() - interval '2 hours 45 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Опишите ваше главное достижение. Что именно сделали вы?', 'text', now() - interval '2 hours 40 min'),
    (gen_random_uuid(), iv_id, 'user', 'FarmHelper: за 6 месяцев набрал 500 пользователей. Получили грант от МЦРИАП на 1.5 млн тенге. Я разработал алгоритм автоматического полива.', 'text', now() - interval '2 hours 35 min');

  INSERT INTO candidate_evaluations (id, "candidateId", "problemSolving", "leadershipPotential",
    adaptability, "changeAgentMindset", "softSkills", authenticity, "overallScore",
    confidence, strengths, weaknesses, "redFlags", reasoning, recommendation, "evaluatorType", "createdAt")
  VALUES (gen_random_uuid(), cand_id, 90, 72, 80, 82, 75, 78, 78, 66,
    '["Технический потенциал", "Аналитическое мышление", "Конкретные результаты"]'::jsonb,
    '["Слабый опыт командного лидерства", "Мотивация не направлена на социальное влияние"]'::jsonb,
    '[]'::jsonb,
    'Технически сильный кандидат с реальными достижениями. Лидерский потенциал есть, но пока не раскрыт. Рекомендуется собеседование с комиссией.',
    'Proceed to committee discussion', 'llm_gpt4o', now());
END $$;

-- =============================================================================
-- CANDIDATE 3: Малика Тасова — Ожидает (score: 71)
-- =============================================================================
DO $$
DECLARE
  acc_id  uuid := gen_random_uuid();
  cand_id uuid := gen_random_uuid();
  sess_id uuid := gen_random_uuid();
  iv_id   uuid := gen_random_uuid();
BEGIN
  INSERT INTO accounts (id, role, name, email, phone, "passwordHash", "createdAt", "updatedAt")
  VALUES (acc_id, 'candidate', 'Малика Тасова', 'malika.tasova@demo.kz', '+77011234503',
    '239db55f0503db1ef45a3044b10df019:40a5cfa8a3a50d66af1669d7e9bc5e0bd22a98053706f4f0d7a49a2d901d09f593578eb918ef3703fe056c4f7f0df5b657041b6a38fde0a22b7918bae64d351b',
    now(), now());

  INSERT INTO candidates (id, "accountId", code, "fullName", email, phone, city, institution, status,
    goals, experience, "motivationText", "overallScore", "createdAt", "updatedAt")
  VALUES (cand_id, acc_id, 'IU-2403', 'Малика Тасова', 'malika.tasova@demo.kz', '+77011234503',
    'Шымкент', 'ЮКГУ им. М. Ауэзова', 'pending',
    'Реформировать систему дошкольного образования в южных регионах через частно-государственное партнёрство.',
    'Директор студенческого педагогического клуба. Провела 50+ обучающих сессий для учителей.',
    'Найти единомышленников и получить менторство от людей, которые уже меняют страну.',
    71, now(), now());

  INSERT INTO interview_sessions (id, "candidateId", progress, phase, status,
    "cognitiveScore", "leadershipScore", "growthScore", "decisionScore",
    "motivationScore", "authenticityScore", "confidenceScore", "aiRiskScore",
    "createdAt", "updatedAt")
  VALUES (iv_id, cand_id, 100, 'Interview completed', 'completed',
    70, 75, 73, 68, 78, 72, 60, 12, now(), now());

  INSERT INTO sessions (id, "accountId", token, "expiresAt", "createdAt")
  VALUES (sess_id, acc_id, gen_random_uuid()::text, now() + interval '30 days', now());

  INSERT INTO interview_messages (id, "sessionId", role, content, type, "createdAt")
  VALUES
    (gen_random_uuid(), iv_id, 'assistant', 'Здравствуйте. Расскажите о себе.', 'text', now() - interval '5 hours'),
    (gen_random_uuid(), iv_id, 'user', 'Малика из Шымкента. Мечтаю изменить дошкольное образование, потому что сама видела как плохие условия влияют на детей.', 'text', now() - interval '4 hours 55 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Почему inVision U?', 'text', now() - interval '4 hours 50 min'),
    (gen_random_uuid(), iv_id, 'user', 'Здесь я могу найти единомышленников и получить менторство от людей, которые уже меняют страну.', 'text', now() - interval '4 hours 45 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Кейс: в вашей школе низкая вовлечённость в общественные проекты. Что вы сделаете за 3 месяца?', 'text', now() - interval '4 hours 40 min'),
    (gen_random_uuid(), iv_id, 'user', 'Сначала проведу опрос, чтобы понять причины. Потом организую мини-события с низким порогом входа и постепенно вовлеку людей через личный пример.', 'text', now() - interval '4 hours 35 min');

  INSERT INTO candidate_evaluations (id, "candidateId", "problemSolving", "leadershipPotential",
    adaptability, "changeAgentMindset", "softSkills", authenticity, "overallScore",
    confidence, strengths, weaknesses, "redFlags", reasoning, recommendation, "evaluatorType", "createdAt")
  VALUES (gen_random_uuid(), cand_id, 70, 75, 73, 68, 78, 72, 71, 60,
    '["Личная история как мотиватор", "Практический подход к кейсу"]'::jsonb,
    '["Ответы местами абстрактны", "Нет конкретных метрик успеха"]'::jsonb,
    '["Может быть недостаточно подготовлена к масштабной работе"]'::jsonb,
    'Кандидат искренний, с чёткой личной мотивацией. Глубина системного мышления пока невысокая. Требует дополнительного рассмотрения.',
    'Escalate to committee review', 'llm_gpt4o', now());
END $$;

-- =============================================================================
-- CANDIDATE 4: Арман Жаксыбеков — Ожидает (score: 66, высокий AI риск)
-- =============================================================================
DO $$
DECLARE
  acc_id  uuid := gen_random_uuid();
  cand_id uuid := gen_random_uuid();
  sess_id uuid := gen_random_uuid();
  iv_id   uuid := gen_random_uuid();
BEGIN
  INSERT INTO accounts (id, role, name, email, phone, "passwordHash", "createdAt", "updatedAt")
  VALUES (acc_id, 'candidate', 'Арман Жаксыбеков', 'arman.zhaksybekov@demo.kz', '+77011234504',
    '2fcac7e2f9305dd7ad306e41de52fc90:5982831b9be63c9dc897d74145ca0b7295a9af2adabed3e589003e271421c6ca746f15967120a19d786281987a3ff8cb72491614f149564675e3b066e1fd675d',
    now(), now());

  INSERT INTO candidates (id, "accountId", code, "fullName", email, phone, city, institution, status,
    goals, experience, "motivationText", "overallScore", "createdAt", "updatedAt")
  VALUES (cand_id, acc_id, 'IU-2404', 'Арман Жаксыбеков', 'arman.zhaksybekov@demo.kz', '+77011234504',
    'Алматы', 'КИМЭП', 'flagged',
    'Построить инвестиционный фонд для поддержки стартапов из регионов Казахстана.',
    'Стажёр в венчурном фонде. Участник Harvard Model UN. Основатель студенческого инвестиционного клуба.',
    'Хочу быть в среде лидеров нового поколения.',
    66, now(), now());

  INSERT INTO interview_sessions (id, "candidateId", progress, phase, status,
    "cognitiveScore", "leadershipScore", "growthScore", "decisionScore",
    "motivationScore", "authenticityScore", "confidenceScore", "aiRiskScore",
    "createdAt", "updatedAt")
  VALUES (iv_id, cand_id, 100, 'Interview completed', 'completed',
    72, 65, 63, 68, 60, 58, 56, 72, now(), now());

  INSERT INTO sessions (id, "accountId", token, "expiresAt", "createdAt")
  VALUES (sess_id, acc_id, gen_random_uuid()::text, now() + interval '30 days', now());

  INSERT INTO interview_messages (id, "sessionId", role, content, type, "createdAt")
  VALUES
    (gen_random_uuid(), iv_id, 'assistant', 'Здравствуйте. Расскажите о себе.', 'text', now() - interval '6 hours'),
    (gen_random_uuid(), iv_id, 'user', 'Арман, учусь в КИМЭП на финансах. Занимаюсь инвестициями и хочу помочь региональным предпринимателям получить доступ к капиталу.', 'text', now() - interval '5 hours 55 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Почему именно inVision U?', 'text', now() - interval '5 hours 50 min'),
    (gen_random_uuid(), iv_id, 'user', 'Это уникальная программа, которая готовит лидеров нового поколения. Я хочу быть в этой среде и получить необходимые навыки.', 'text', now() - interval '5 hours 45 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Опишите ситуацию, где вы изменили ход событий.', 'text', now() - interval '5 hours 40 min'),
    (gen_random_uuid(), iv_id, 'user', 'В нашем клубе была проблема с активностью. Я предложил новый формат встреч — питч-сессии с реальными менторами. Участие выросло с 15 до 60 человек.', 'text', now() - interval '5 hours 35 min');

  INSERT INTO candidate_evaluations (id, "candidateId", "problemSolving", "leadershipPotential",
    adaptability, "changeAgentMindset", "softSkills", authenticity, "overallScore",
    confidence, strengths, weaknesses, "redFlags", reasoning, recommendation, "evaluatorType", "createdAt")
  VALUES (gen_random_uuid(), cand_id, 72, 65, 63, 68, 60, 58, 66, 56,
    '["Понимание финансовых инструментов", "Инициативность в клубной деятельности"]'::jsonb,
    '["Мотивация звучит шаблонно", "Мало личных специфических деталей"]'::jsonb,
    '["Ответы частично похожи на типичные шаблоны", "Низкая оригинальность примеров"]'::jsonb,
    'Кандидат имеет базовую компетентность, но ответы недостаточно глубокие. Высокий AI риск — требуется ручная проверка подлинности ответов.',
    'Escalate to committee review', 'llm_gpt4o', now());
END $$;

-- =============================================================================
-- CANDIDATE 5: Зарина Нурмаганбет — В процессе (57%)
-- =============================================================================
DO $$
DECLARE
  acc_id  uuid := gen_random_uuid();
  cand_id uuid := gen_random_uuid();
  sess_id uuid := gen_random_uuid();
  iv_id   uuid := gen_random_uuid();
BEGIN
  INSERT INTO accounts (id, role, name, email, phone, "passwordHash", "createdAt", "updatedAt")
  VALUES (acc_id, 'candidate', 'Зарина Нурмаганбет', 'zarina.nurmagambet@demo.kz', '+77011234505',
    '89d45196d1df46520fb4bbf93909ee02:40dd9b71f66eb55c3315fe142667f304aafa69b7be615810d28380adc699997efe4d45b8f9fec8d143cac75e216af71c8390f01588c4aab3038bed771fe94aec',
    now(), now());

  INSERT INTO candidates (id, "accountId", code, "fullName", email, phone, city, institution, status,
    goals, experience, "motivationText", "createdAt", "updatedAt")
  VALUES (cand_id, acc_id, 'IU-2405', 'Зарина Нурмаганбет', 'zarina.nurmagambet@demo.kz', '+77011234505',
    'Павлодар', 'ПГУ им. Торайгырова', 'in_progress',
    'Развить сеть психологической поддержки для молодёжи в малых городах Казахстана.',
    'Волонтёр кризисного центра. Автор подкаста о психическом здоровье (3000+ слушателей).',
    'Хочу получить структуру и нетворк для масштабирования работы по психологическому просвещению.');

  INSERT INTO interview_sessions (id, "candidateId", progress, phase, status,
    "createdAt", "updatedAt")
  VALUES (iv_id, cand_id, 57, 'Leadership and motivation', 'active', now(), now());

  INSERT INTO sessions (id, "accountId", token, "expiresAt", "createdAt")
  VALUES (sess_id, acc_id, gen_random_uuid()::text, now() + interval '30 days', now());

  INSERT INTO interview_messages (id, "sessionId", role, content, type, "createdAt")
  VALUES
    (gen_random_uuid(), iv_id, 'assistant', 'Здравствуйте. Я AI interviewer InsightU. Расскажите кратко о себе.', 'text', now() - interval '30 min'),
    (gen_random_uuid(), iv_id, 'user', 'Зарина из Павлодара. Занимаюсь психологическим просвещением и мечтаю сделать психологическую помощь доступной для молодёжи в регионах.', 'text', now() - interval '28 min'),
    (gen_random_uuid(), iv_id, 'assistant', 'Почему вы хотите поступить в inVision U?', 'text', now() - interval '25 min'),
    (gen_random_uuid(), iv_id, 'user', 'Я вижу, что у меня есть идеи и энергия, но не хватает структуры и нетворка. inVision U может дать мне эти инструменты для масштабирования.', 'text', now() - interval '22 min');
END $$;

-- =============================================================================
-- VERIFY
-- =============================================================================
SELECT
  a.name,
  a.phone,
  c.code,
  c.status,
  c."overallScore",
  iv.progress,
  iv.phase
FROM accounts a
JOIN candidates c ON c."accountId" = a.id
LEFT JOIN interview_sessions iv ON iv."candidateId" = c.id
WHERE a.phone LIKE '+770112345%'
ORDER BY c.code;
