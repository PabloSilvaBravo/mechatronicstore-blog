import { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Lazy init para no romper builds cuando RESEND_API_KEY no está set.
 * (e.g. preview deploys o local sin .env.local completo)
 */
function getClient(): Resend {
  if (!cached) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY not set");
    }
    cached = new Resend(key);
  }
  return cached;
}

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(args: SendArgs): Promise<{ id: string }> {
  const client = getClient();
  const from =
    args.from ||
    process.env.DIGEST_FROM_EMAIL ||
    "blog@mechatronicstore.cl";
  const result = await client.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
  });
  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  if (!result.data?.id) {
    throw new Error("Resend returned no id");
  }
  return { id: result.data.id };
}
