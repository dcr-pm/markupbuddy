import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY!);
  }
  return resendClient;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
}

export async function sendTestEmail({
  to,
  subject,
  html,
  fromName,
  replyTo,
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  try {
    const { error } = await resend.emails.send({
      from: `${fromName || "MarkupBuddy"} <test@${getDomain()}>`,
      to,
      subject: subject || "Test Email from MarkupBuddy",
      html,
      replyTo: replyTo || undefined,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

function getDomain(): string {
  return process.env.RESEND_DOMAIN || "admin.markupbuddy.com";
}
