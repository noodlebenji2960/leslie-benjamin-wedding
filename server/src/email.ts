import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const ADMIN_RESET_EMAIL = process.env.ADMIN_RESET_EMAIL || "";
const EMAIL_FROM =
  process.env.EMAIL_FROM || "noreply@leslie-and-benjamin.es";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendAdminOtpEmail(otp: string): Promise<void> {
  if (!resend) throw new Error("Email is not configured (missing RESEND_API_KEY).");
  if (!ADMIN_RESET_EMAIL) throw new Error("Email is not configured (missing ADMIN_RESET_EMAIL).");

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: ADMIN_RESET_EMAIL,
    subject: "Your admin password reset code",
    html: `<p>Your one-time code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${otp}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });

  if (error) throw new Error(`Failed to send email: ${error.message}`);
}
