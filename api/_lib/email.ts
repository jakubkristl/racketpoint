export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function asBool(value: string | undefined, fallback = false) {
  if (value == null) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
}

export async function sendTransactionalEmail(message: EmailMessage) {
  const webhookUrl = (process.env.EMAIL_WEBHOOK_URL ?? '').trim();
  const from = (process.env.EMAIL_FROM ?? 'no-reply@racketpoint.bg').trim();

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Email webhook rejected request (${response.status}): ${body}`);
    }

    return { accepted: true, provider: 'webhook' as const };
  }

  // Safe local fallback for dev: do not fail business flow when provider is not configured.
  if (asBool(process.env.EMAIL_DEBUG_LOG_ONLY, true) || process.env.NODE_ENV !== 'production') {
    console.log('[email:debug]', {
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { accepted: true, provider: 'debug-log' as const };
  }

  throw new Error('EMAIL_WEBHOOK_URL is missing in production.');
}
