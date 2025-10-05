import { logger } from '../config/logger.js';

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(options: EmailOptions) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    logger.error('SENDGRID_API_KEY is not set. Cannot send email.');
    return;
  }

  // Parse the from address for detailed logging
  let fromEmail: string;
  let fromName: string;
  
  try {
    if (options.from.includes('<')) {
      fromEmail = options.from.split('<')[1].slice(0, -1).trim();
      fromName = options.from.split('<')[0].trim();
    } else {
      fromEmail = options.from.trim();
      fromName = '';
    }
  } catch (parseError) {
    logger.error({ 
      error: parseError, 
      rawFrom: options.from 
    }, 'Failed to parse from address');
    throw new Error('Invalid from address format');
  }

  // Extract Reply-To from headers if it exists
  const customHeaders = { ...options.headers };
  const replyToEmail = options.replyTo || customHeaders['Reply-To'];
  delete customHeaders['Reply-To'];

  const emailBody: any = {
    personalizations: [{ to: [{ email: options.to }] }],
    from: { 
      email: fromEmail,
      ...(fromName && { name: fromName })
    },
    subject: options.subject,
    content: [{ type: 'text/html', value: options.html }],
  };

  if (replyToEmail) {
    emailBody.reply_to = { email: replyToEmail };
  }

  if (Object.keys(customHeaders).length > 0) {
    emailBody.headers = customHeaders;
  }

  // Enhanced debug logging before sending
  logger.info({
    emailDetails: {
      to: options.to,
      from: fromEmail,
      fromName: fromName || 'none',
      replyTo: replyToEmail || 'none',
      subject: options.subject,
      hasCustomHeaders: Object.keys(customHeaders).length > 0,
      bodySize: JSON.stringify(emailBody).length
    }
  }, 'Attempting to send email via SendGrid');

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
      logger.error({ 
        statusCode: response.status,
        statusText: response.statusText,
        error: errorBody,
        emailAttempt: {
          to: options.to,
          from: fromEmail,
          fromName: fromName || 'none',
          replyTo: replyToEmail || 'none'
        }
      }, `Failed to send email to ${options.to}`);
      
      // Throw error so caller knows it failed
      throw new Error(`SendGrid API error: ${JSON.stringify(errorBody)}`);
    } else {
      logger.info({
        to: options.to,
        from: fromEmail,
        subject: options.subject
      }, `Successfully sent email to ${options.to}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('SendGrid API error')) {
      throw error; // Re-throw SendGrid errors
    }
    logger.error({ 
      error,
      emailAttempt: {
        to: options.to,
        from: fromEmail,
      }
    }, 'Network error sending email via SendGrid');
    throw new Error(`Email send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}