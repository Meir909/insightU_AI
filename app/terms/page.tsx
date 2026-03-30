import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
      <div className="page-shell max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-text-muted">Legal</p>
          <h1 className="text-4xl font-black tracking-tight text-white">Условия использования</h1>
          <p className="text-sm leading-relaxed text-text-secondary">
            Эти условия регулируют использование InsightU AI кандидатами и членами комиссии inVision U.
          </p>
        </div>

        <section className="panel-soft space-y-6 p-6 text-sm leading-relaxed text-text-secondary">
          <div>
            <h2 className="text-lg font-bold text-white">Для кандидатов</h2>
            <p className="mt-2">
              Кандидат обязуется предоставлять достоверную информацию и материалы. Попытки манипуляции, подмены данных
              или обхода процедуры могут привести к ручной эскалации или отклонению заявки.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Для комиссии</h2>
            <p className="mt-2">
              Комиссия использует систему как decision-support инструмент. AI recommendation не заменяет human review.
              Принятие кандидата одним человеком недопустимо.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Безопасность</h2>
            <p className="mt-2">
              Пользователи обязаны не передавать свои данные доступа третьим лицам. Все критические действия могут быть
              записаны в audit trail.
            </p>
          </div>
        </section>

        <Link href="/sign-in" className="inline-flex text-sm text-brand-green hover:text-brand-dim">
          Вернуться ко входу →
        </Link>
      </div>
    </div>
  );
}
