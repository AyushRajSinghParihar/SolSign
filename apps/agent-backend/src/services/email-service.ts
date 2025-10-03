import { logger } from '../config/logger.js';

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo?: string; // Use dedicated replyTo field instead of headers
  headers?: Record<string, string>;
}

export async function sendEmail(options: EmailOptions) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    logger.error('SENDGRID_API_KEY is not set. Cannot send email.');
    return;
  }

  // Extract Reply-To from headers if it exists (for backward compatibility)
  // and remove it from custom headers since it's a reserved header
  const customHeaders = { ...options.headers };
  const replyToEmail = options.replyTo || customHeaders['Reply-To'];
  delete customHeaders['Reply-To']; // Remove reserved header

  const emailBody: any = {
    personalizations: [{ to: [{ email: options.to }] }],
    from: { email: options.from.split('<')[1].slice(0,-1), name: options.from.split('<')[0].trim() },
    subject: options.subject,
    content: [{ type: 'text/html', value: options.html }],
  };

  // Add reply_to as a top-level field if provided
  if (replyToEmail) {
    emailBody.reply_to = { email: replyToEmail };
  }

  // Only add headers if there are non-reserved headers
  if (Object.keys(customHeaders).length > 0) {
    emailBody.headers = customHeaders;
  }

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