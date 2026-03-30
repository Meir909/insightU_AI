import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
      <div className="page-shell max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-text-muted">Legal</p>
          <h1 className="text-4xl font-black tracking-tight text-white">Политика конфиденциальности</h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            InsightU AI обрабатывает данные кандидатов исключительно для admissions workflow inVision U, explainability,
            безопасности и проверки решений комиссии.
          </p>
        </div>

        <section className="panel-soft space-y-6 p-6 text-sm leading-relaxed text-text-secondary">
          <div>
            <h2 className="text-lg font-bold text-white">Какие данные собираются</h2>
            <p className="mt-2">
              Имя, телефон, email, ответы в интервью, резюме, документы, аудио и видеоартефакты, а также действия
              комиссии и audit trail.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Для чего используются данные</h2>
            <p className="mt-2">
              Для оценки кандидата, формирования объяснимой рекомендации, обнаружения рисков, организации review flow и
              принятия финального human decision комиссией.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Ограничения</h2>
            <p className="mt-2">
              AI не принимает окончательное решение о зачислении. Финальное решение всегда остаётся за комиссией.
              Решения комиссии журналируются.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Хранение и доступ</h2>
            <p className="mt-2">
              Доступ к данным ограничен ролями. Сессии защищены серверными cookie. Файлы и результаты оценки должны
              храниться только в настроенном production storage и базе данных.
            </p>
          </div>
        </section>

        <Link href="/sign-up" className="inline-flex text-sm text-brand-green hover:text-brand-dim">
          Вернуться к регистрации →
        </Link>
      </div>
    </div>
  );
}
