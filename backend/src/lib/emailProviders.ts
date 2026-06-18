export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface SendResult {
  success: boolean;
  provider: string;
  message_id?: string;
  error?: string;
}

export type ProviderName = 'smtp' | 'sendgrid' | 'resend';

// ── Resend ────────────────────────────────────────────────────────────────────

async function sendViaResend(payload: EmailPayload): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const from = payload.from ?? process.env.RESEND_FROM ?? 'outreach@datiam.io';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? `<pre style="white-space:pre-wrap">${payload.text}</pre>`,
    }),
  });

  const data = (await response.json()) as { id?: string; message?: string; error?: { message: string } };

  if (!response.ok) {
    return {
      success: false,
      provider: 'resend',
      error: data.error?.message ?? data.message ?? `HTTP ${response.status}`,
    };
  }

  return { success: true, provider: 'resend', message_id: data.id };
}

// ── SendGrid ──────────────────────────────────────────────────────────────────

async function sendViaSendGrid(payload: EmailPayload): Promise<SendResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');

  const from = payload.from ?? process.env.SENDGRID_FROM ?? 'outreach@datiam.io';

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }], subject: payload.subject }],
      from: { email: from },
      content: [
        { type: 'text/plain', value: payload.text },
        ...(payload.html ? [{ type: 'text/html', value: payload.html }] : []),
      ],
    }),
  });

  if (response.status === 202) {
    const messageId = response.headers.get('x-message-id') ?? undefined;
    return { success: true, provider: 'sendgrid', message_id: messageId };
  }

  const data = (await response.json().catch(() => ({}))) as { errors?: Array<{ message: string }> };
  return {
    success: false,
    provider: 'sendgrid',
    error: data.errors?.[0]?.message ?? `HTTP ${response.status}`,
  };
}

// ── SMTP (nodemailer) ─────────────────────────────────────────────────────────

async function sendViaSMTP(payload: EmailPayload): Promise<SendResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer') as typeof import('nodemailer');

  const host = process.env.SMTP_HOST;
  if (!host) throw new Error('SMTP_HOST not configured');

  const port   = Number(process.env.SMTP_PORT ?? 587);
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;
  const from   = payload.from ?? process.env.SMTP_FROM ?? user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  const info = await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return { success: true, provider: 'smtp', message_id: String(info.messageId ?? '') };
}

// ── Auto-detect & dispatch ────────────────────────────────────────────────────

export function detectProvider(): ProviderName {
  if (process.env.RESEND_API_KEY)   return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.SMTP_HOST)        return 'smtp';
  throw new Error(
    'No email provider configured. Set RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST.',
  );
}

export async function sendEmail(
  payload: EmailPayload,
  provider?: ProviderName,
): Promise<SendResult> {
  const p = provider ?? detectProvider();
  switch (p) {
    case 'resend':   return sendViaResend(payload);
    case 'sendgrid': return sendViaSendGrid(payload);
    case 'smtp':     return sendViaSMTP(payload);
    default:         throw new Error(`Unknown email provider: ${String(p)}`);
  }
}
