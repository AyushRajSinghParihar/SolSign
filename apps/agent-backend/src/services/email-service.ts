import { logger } from '../config/logger.js';

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

// Simple in-memory rate limiter
const emailRateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(to: string, maxEmails: number = 10, windowMinutes: number = 5): boolean {
  const now = Date.now();
  const key = to.toLowerCase();
  const record = emailRateLimiter.get(key);
  
  if (!record || now > record.resetTime) {
    emailRateLimiter.set(key, {
      count: 1,
      resetTime: now + windowMinutes * 60 * 1000
    });
    return true;
  }
  
  if (record.count >= maxEmails) {
    logger.warn({ to, count: record.count, windowMinutes }, 'Rate limit exceeded for email recipient');
    return false;
  }
  
  record.count++;
  return true;
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        logger.warn({ attempt: attempt + 1, delay, error: lastError.message }, 'Retrying after error');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function sendEmail(options: EmailOptions) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    logger.error('SENDGRID_API_KEY is not set. Cannot send email.');
    return;
  }
  
  // Check rate limit
  if (!checkRateLimit(options.to)) {
    throw new Error(`Rate limit exceeded for ${options.to}. Please try again later.`);
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

  // Wrap the email sending in retry logic
  try {
    await retryWithBackoff(async () => {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(emailBody),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Unable to parse error response' }));
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
        
        // Throw error to trigger retry
        throw new Error(`SendGrid API error (${response.status}): ${JSON.stringify(errorBody)}`);
      }
      
      return response;
    });
    
    logger.info({
      to: options.to,
      from: fromEmail,
      subject: options.subject
    }, `Successfully sent email to ${options.to}`);
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      emailAttempt: {
        to: options.to,
        from: fromEmail,
      }
    }, 'Failed to send email after retries');
    throw new Error(`Email send failed after retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}