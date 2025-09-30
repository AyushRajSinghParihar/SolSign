const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions) {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set. Cannot send email.');
    return;
  }

  const emailBody = {
    from: 'SolSignAI <onboarding@resend.dev>',
    ...options,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailBody),
  });

  if (!response.ok) {
    console.error('Failed to send email:', await response.json());
  } else {
    console.log(`Successfully sent email to ${options.to}`);
  }
}