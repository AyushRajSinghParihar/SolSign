import { logger } from '../config/logger.js';

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export async function sendEmail(options: EmailOptions) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    logger.error('SENDGRID_API_KEY is not set. Cannot send email.');
    return;
  }

  const emailBody = {
    personalizations: [{ to: [{ email: options.to }] }],
    from: { email: options.from.split('<')[1].slice(0,-1), name: options.from.split('<')[0].trim() },
    subject: options.subject,
    content: [{ type: 'text/html', value: options.html }],
    headers: options.headers || {},
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(emailBody),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      logger.error({ error: errorBody }, `Failed to send email to ${options.to}`);
    } else {
      logger.info(`Successfully sent email to ${options.to}`);
    }
  } catch (error) {
    logger.error({ error }, 'Error sending email via SendGrid');
  }
}