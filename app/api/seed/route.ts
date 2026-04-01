/**
 * POST /api/seed
 * Creates 5 realistic test candidates for demo purposes.
 * Protected by SEED_SECRET env variable (or "demo-seed-2025" default).
 * Safe to call multiple times — skips existing accounts by phone.
 */
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/server/password";
import {
  createCandidateAccountWithSession,
  updateCandidate,
  updateInterviewProgress,
  createEvaluation,
  addInterviewMessage,
  getInterviewSessionByCandidateId,
} from "@/lib/server/prisma";

const SEED_SECRET = process.env.SEED_SECRET || "demo-seed-2025";

const CANDIDATES = [
  {
    name: "Айгерим Бекова",
    phone: "+77011234501",
    email: "aigrim.bekova@demo.kz",
    city: "Алматы",
    institution: "Назарбаев Университет",
    goals: "Стать социальным предпринимателем и развить сеть экологических коопераций в Казахстане.",
    experience: "Организовала волонтёрский проект по озеленению школ (2 года, 400+ участников). Стипендиат БОЛАШАК.",
    progress: 100,
    phase: "Interview completed",
    status: "shortlisted",
    overallScore: 84,
    messages: [
      { role: "assistant", content: "Здравствуйте. Я AI interviewer InsightU. Расскажите о себе." },
      { role: "user", content: "Меня зовут Айгерим. Я выросла в Алматы, в семье учителей. С детства интересовалась экологией и общественными проектами." },
      { role: "assistant", content: "Почему вы хотите поступить в inVision U?" },
      { role: "user", content: "Я хочу получить инструменты системного мышления, чтобы масштабировать свои проекты. inVision U — это именно та среда, где я смогу вырасти как лидер." },
      { role: "assistant", content: "Расскажите про ситуацию, где вы взяли инициативу." },
      { role: "user", content: "Когда никто не хотел брать ответственность за организацию городского субботника, я составила план на 3 месяца, собрала команду из 40 человек и мы привлекли 3 спонсора." },
    ],
    evaluation: {
      cognitive: 82, leadership: 88, growth: 85, decision: 80, motivation: 90, authenticity: 86, overallScore: 84,
      strengths: ["Системное мышление", "Лидерство через действие", "Искренняя мотивация"],
      weaknesses: ["Недостаточно конкретные метрики результата"],
      redFlags: [],
      reasoning: "Кандидат демонстрирует высокий уровень лидерского потенциала и подлинную мотивацию. Ответы конкретны, подкреплены реальными примерами. Рекомендуется к рассмотрению.",
    },
  },
  {
    name: "Данияр Сейткали",
    phone: "+77011234502",
    email: "daniyar.seitqali@demo.kz",
    city: "Нур-Султан",
    institution: "Евразийский национальный университет",
    goals: "Разработать tech-решения для автоматизации сельского хозяйства в регионах Казахстана.",
    experience: "Победитель олимпиад по информатике, создал мобильное приложение для фермеров (500+ пользователей).",
    progress: 100,
    phase: "Interview completed",
    status: "shortlisted",
    overallScore: 78,
    messages: [
      { role: "assistant", content: "Здравствуйте. Расскажите о себе." },
      { role: "user", content: "Данияр, студент ЕНУ. Увлекаюсь программированием с 12 лет. Создал приложение для управления теплицами." },
      { role: "assistant", content: "Почему inVision U?" },
      { role: "user", content: "Хочу научиться не только делать продукт, но и управлять командами и стратегически думать о бизнесе." },
      { role: "assistant", content: "Опишите ваше главное достижение." },
      { role: "user", content: "Приложение FarmHelper: за 6 месяцев набрало 500 пользователей, получило грант от МЦРИАП на 1.5 млн тенге." },
    ],
    evaluation: {
      cognitive: 90, leadership: 72, growth: 80, decision: 82, motivation: 75, authenticity: 78, overallScore: 78,
      strengths: ["Технический потенциал", "Аналитическое мышление", "Конкретные результаты"],
      weaknesses: ["Слабый опыт командного лидерства", "Мотивация недостаточно направлена на социальное влияние"],
      redFlags: [],
      reasoning: "Технически сильный кандидат с реальными достижениями. Лидерский потенциал есть, но пока не раскрыт. Рекомендуется собеседование с комиссией.",
    },
  },
  {
    name: "Малика Тасова",
    phone: "+77011234503",
    email: "malika.tasova@demo.kz",
    city: "Шымкент",
    institution: "ЮКГУ им. М. Ауэзова",
    goals: "Реформировать систему дошкольного образования в южных регионах через частно-государственное партнёрство.",
    experience: "Директор студенческого педагогического клуба, провела 50+ обучающих сессий для учителей.",
    progress: 100,
    phase: "Interview completed",
    status: "pending",
    overallScore: 71,
    messages: [
      { role: "assistant", content: "Здравствуйте. Расскажите о себе." },
      { role: "user", content: "Малика, из Шымкента. Мечтаю изменить дошкольное образование, потому что сама видела, как плохие условия влияют на детей." },
      { role: "assistant", content: "Почему inVision U?" },
      { role: "user", content: "Здесь я могу найти единомышленников и получить менторство от людей, которые уже меняют страну." },
      { role: "assistant", content: "Кейс: низкая вовлечённость в общественные проекты. Что сделаете?" },
      { role: "user", content: "Сначала проведу опрос, чтобы понять причины. Потом организую серию мини-событий с низким порогом входа и постепенно вовлеку людей через личный пример." },
    ],
    evaluation: {
      cognitive: 70, leadership: 75, growth: 73, decision: 68, motivation: 78, authenticity: 72, overallScore: 71,
      strengths: ["Личная история как мотиватор", "Практический подход к кейсу"],
      weaknesses: ["Ответы местами абстрактны", "Нет конкретных метрик успеха"],
      redFlags: ["Может быть недостаточно подготовлена к масштабной работе"],
      reasoning: "Кандидат искренний, с чёткой личной мотивацией. Однако глубина системного мышления пока невысокая. Требует дополнительного рассмотрения.",
    },
  },
  {
    name: "Арман Жаксыбеков",
    phone: "+77011234504",
    email: "arman.zhaksybekov@demo.kz",
    city: "Алматы",
    institution: "КИМЭП",
    goals: "Построить инвестиционный фонд для поддержки стартапов из регионов Казахстана.",
    experience: "Стажёр в венчурном фонде, участник Harvard Model UN, основатель студенческого инвестиционного клуба.",
    progress: 100,
    phase: "Interview completed",
    status: "pending",
    overallScore: 66,
    messages: [
      { role: "assistant", content: "Здравствуйте. Расскажите о себе." },
      { role: "user", content: "Арман, учусь в КИМЭП на финансах. Занимаюсь инвестициями и хочу помочь региональным предпринимателям получить доступ к капиталу." },
      { role: "assistant", content: "Почему inVision U?" },
      { role: "user", content: "Это уникальная программа, которая готовит лидеров нового поколения. Я хочу быть в этой среде." },
      { role: "assistant", content: "Опишите ситуацию, где вы изменили ход событий." },
      { role: "user", content: "В нашем клубе была проблема с активностью. Я предложил новый формат встреч — питч-сессии с реальными менторами. Участие выросло с 15 до 60 человек." },
    ],
    evaluation: {
      cognitive: 72, leadership: 65, growth: 63, decision: 68, motivation: 60, authenticity: 58, overallScore: 66,
      strengths: ["Понимание финансовых инструментов", "Инициативность в клубной деятельности"],
      weaknesses: ["Мотивация звучит шаблонно", "Мало личных специфических деталей"],
      redFlags: ["Ответы частично похожи на типичные шаблоны", "Низкая оригинальность примеров"],
      reasoning: "Кандидат имеет базовую компетентность, но ответы недостаточно глубокие и специфические. Рекомендуется ручная проверка.",
    },
  },
  {
    name: "Зарина Нурмаганбет",
    phone: "+77011234505",
    email: "zarina.nurmagambet@demo.kz",
    city: "Павлодар",
    institution: "ПГУ им. Торайгырова",
    goals: "Развить сеть психологической поддержки для молодёжи в малых городах Казахстана.",
    experience: "Волонтёр кризисного центра, автор подкаста о психическом здоровье (3000+ слушателей).",
    progress: 57,
    phase: "Leadership and motivation",
    status: "in_progress",
    overallScore: 0,
    messages: [
      { role: "assistant", content: "Здравствуйте. Расскажите о себе." },
      { role: "user", content: "Зарина из Павлодара. Я занимаюсь психологическим просвещением и мечтаю сделать психологическую помощь доступной для молодёжи в регионах." },
      { role: "assistant", content: "Почему вы хотите поступить в inVision U?" },
      { role: "user", content: "Я вижу, что у меня есть идеи и энергия, но не хватает структуры и нетворка, чтобы масштабировать работу. inVision U может дать мне эти инструменты." },
    ],
    evaluation: null,
  },
];

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-seed-secret") || new URL(request.url).searchParams.get("secret");
  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  for (const c of CANDIDATES) {
    try {
      const passwordHash = hashPassword("Demo1234!");
      const result = await createCandidateAccountWithSession({
        name: c.name,
        phone: c.phone,
        email: c.email,
        passwordHash,
      });

      const candidateId = result.candidate.id;
      const interviewSession = await getInterviewSessionByCandidateId(candidateId);
      const sessionId = interviewSession?.id;

      // Update candidate profile fields
      await updateCandidate(candidateId, {
        city: c.city,
        institution: c.institution,
        goals: c.goals,
        experience: c.experience,
        status: c.status,
        overallScore: c.overallScore || undefined,
      });

      // Update interview session progress
      if (sessionId) {
        await updateInterviewProgress(sessionId, c.progress, c.phase, {
          status: c.progress >= 100 ? "completed" : "active",
          cognitiveScore: c.evaluation?.cognitive,
          leadershipScore: c.evaluation?.leadership,
          growthScore: c.evaluation?.growth,
          decisionScore: c.evaluation?.decision,
          motivationScore: c.evaluation?.motivation,
          authenticityScore: c.evaluation?.authenticity,
          confidenceScore: c.evaluation ? Math.round(c.evaluation.overallScore * 0.85) : undefined,
          aiRiskScore: c.evaluation?.redFlags?.length ? c.evaluation.redFlags.length * 18 : 5,
        });

        // Add interview messages
        for (const msg of c.messages) {
          await addInterviewMessage({
            sessionId,
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      }

      // Create evaluation for completed interviews
      if (c.evaluation) {
        await createEvaluation({
          candidateId,
          problemSolving: c.evaluation.cognitive,
          leadershipPotential: c.evaluation.leadership,
          adaptability: c.evaluation.growth,
          changeAgentMindset: c.evaluation.decision,
          softSkills: c.evaluation.motivation,
          authenticity: c.evaluation.authenticity,
          overallScore: c.evaluation.overallScore,
          confidence: Math.round(c.evaluation.overallScore * 0.85),
          strengths: c.evaluation.strengths,
          weaknesses: c.evaluation.weaknesses,
          redFlags: c.evaluation.redFlags,
          reasoning: c.evaluation.reasoning,
          recommendation: c.evaluation.overallScore >= 70 ? "Proceed to committee discussion" : "Escalate to committee review",
          evaluatorType: "llm_gpt4o",
        });
      }

      results.push(`✓ ${c.name} (${c.phone})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`✗ ${c.name}: ${msg}`);
    }
  }

  return NextResponse.json({
    created: results,
    skipped: errors,
    note: "Login with phone + password 'Demo1234!'",
  });
}
