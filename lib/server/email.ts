import { Resend } from "resend";
import { logger } from "./logging";

const FROM = process.env.RESEND_FROM ?? "noreply@invisionu.kz";
const COMMITTEE_NOTIFY_EMAIL = process.env.COMMITTEE_NOTIFY_EMAIL ?? "review@invisionu.kz";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/** Send welcome email to a newly registered candidate */
export async function sendCandidateWelcome({
  name,
  email,
  phone,
  code,
}: {
  name: string;
  email?: string | null;
  phone?: string | null;
  code: string;
}) {
  const recipient = email;
  if (!recipient) return; // candidate registered without email
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: recipient,
      subject: "Добро пожаловать в inVision U 🎓",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f0f0f0;border-radius:16px;overflow:hidden;">
          <div style="background:#00e676;padding:32px 32px 24px;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#000;letter-spacing:-0.5px;">inVision U</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#00000099;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;">AI-отбор кандидатов</p>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#fff;">Здравствуйте, ${name}!</h2>
            <p style="margin:0 0 24px;color:#a0a0a0;line-height:1.6;">Ваш аккаунт успешно создан. Теперь вы можете заполнить анкету кандидата и пройти AI-интервью.</p>
            <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#606060;">Ваш код кандидата</p>
              <p style="margin:0;font-family:monospace;font-size:22px;font-weight:900;color:#00e676;">${code}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#606060;">Укажите этот код при обращении в поддержку.</p>
            </div>
            ${phone ? `<p style="margin:0 0 24px;font-size:13px;color:#a0a0a0;">Телефон: <strong style="color:#f0f0f0;">${phone}</strong></p>` : ""}
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://invisionu.kz"}/account" style="display:inline-block;background:#00e676;color:#000;font-weight:800;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">
              Открыть личный кабинет →
            </a>
            <p style="margin:32px 0 0;font-size:12px;color:#606060;line-height:1.6;">
              Если вы не регистрировались — просто проигнорируйте это письмо.<br>
              AI-оценка носит рекомендательный характер. Итоговое решение остаётся за комиссией inVision U.
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    logger.api.error("Failed to send candidate welcome email", error as Error, { code });
  }
}

/** Send welcome email to a newly registered committee member */
export async function sendCommitteeWelcome({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Добро пожаловать в комиссию inVision U",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f0f0f0;border-radius:16px;overflow:hidden;">
          <div style="background:#00e676;padding:32px 32px 24px;">
            <h1 style="margin:0;font-size:24px;font-weight:900;color:#000;letter-spacing:-0.5px;">inVision U</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#00000099;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;">Панель комиссии</p>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#fff;">Здравствуйте, ${name}!</h2>
            <p style="margin:0 0 24px;color:#a0a0a0;line-height:1.6;">Ваш аккаунт члена комиссии успешно создан. Вы будете получать уведомления о новых кандидатах, которые завершили интервью.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://invisionu.kz"}/dashboard" style="display:inline-block;background:#00e676;color:#000;font-weight:800;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">
              Открыть дашборд →
            </a>
            <p style="margin:32px 0 0;font-size:12px;color:#606060;line-height:1.6;">
              Если вы не регистрировались — немедленно сообщите администратору.<br>
              Все действия в системе протоколируются.
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    logger.api.error("Failed to send committee welcome email", error as Error, { email });
  }
}

/** Notify all committee members about a new candidate who completed registration */
export async function notifyCommitteeNewCandidate({
  candidateName,
  candidateCode,
  candidateCity,
  candidateProgram,
}: {
  candidateName: string;
  candidateCode: string;
  candidateCity?: string | null;
  candidateProgram?: string | null;
}) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: COMMITTEE_NOTIFY_EMAIL,
      subject: `Новый кандидат: ${candidateName} (${candidateCode})`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#f0f0f0;border-radius:16px;overflow:hidden;">
          <div style="background:#1a1a1a;border-top:3px solid #00e676;padding:24px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#606060;">inVision U · Уведомление</p>
            <h2 style="margin:8px 0 0;font-size:20px;font-weight:900;color:#fff;">Новый кандидат зарегистрирован</h2>
          </div>
          <div style="padding:32px;">
            <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #2a2a2a;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#606060;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;width:120px;">Имя</td>
                  <td style="padding:6px 0;font-size:14px;color:#fff;font-weight:700;">${candidateName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#606060;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">Код</td>
                  <td style="padding:6px 0;font-family:monospace;font-size:14px;color:#00e676;font-weight:700;">${candidateCode}</td>
                </tr>
                ${candidateCity ? `<tr><td style="padding:6px 0;font-size:12px;color:#606060;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">Город</td><td style="padding:6px 0;font-size:14px;color:#a0a0a0;">${candidateCity}</td></tr>` : ""}
                ${candidateProgram ? `<tr><td style="padding:6px 0;font-size:12px;color:#606060;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">Программа</td><td style="padding:6px 0;font-size:14px;color:#a0a0a0;">${candidateProgram}</td></tr>` : ""}
              </table>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://invisionu.kz"}/dashboard/candidates" style="display:inline-block;background:#00e676;color:#000;font-weight:800;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">
              Просмотреть кандидатов →
            </a>
            <p style="margin:32px 0 0;font-size:12px;color:#606060;">
              Кандидат ещё не прошёл интервью. Вы получите повторное уведомление после завершения AI-оценки.
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    logger.api.error("Failed to notify committee about new candidate", error as Error, { candidateCode });
  }
}
