// Sends mail through Resend's HTTP API (no SDK). Without RESEND_API_KEY + MAIL_FROM nothing is sent:
// in development the message is printed to the server console so the login link can be used locally.
export type Mail = { to: string; subject: string; text: string; html?: string };
export type Mailer = (m: Mail) => Promise<{ delivered: boolean }>;

const resendMailer: Mailer = async (m) => {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === 'production') { console.error('mail not sent: RESEND_API_KEY / MAIL_FROM are not set'); return { delivered: false }; }
    console.log(`\n[dev mail] to: ${m.to}\nsubject: ${m.subject}\n${m.text}\n`);
    return { delivered: false };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text, html: m.html }),
  });
  if (!res.ok) { console.error('resend failed', res.status); return { delivered: false }; }
  return { delivered: true };
};

let mailer: Mailer = resendMailer;
export const sendMail: Mailer = (m) => mailer(m);
export function __setMailer(fn: Mailer | null) { mailer = fn ?? resendMailer; }
