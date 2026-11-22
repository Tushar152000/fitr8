import { Inject, Injectable } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { InjectEnv, type Env } from "../../config/config.module.js";

/** One email: plain text, optionally with an HTML version. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Sender display name. Default "FITR8 website" (the contact form). */
  fromName?: string;
  /** Where "Reply" goes, e.g. the visitor who filled in the contact form. */
  replyTo?: { name: string; address: string };
}

/** Port for sending email. Feature code never touches SMTP; tests swap in a fake. */
export interface Mailer {
  /** False when SMTP isn't configured: callers decide what that means for them. */
  readonly enabled: boolean;
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol("MAILER");
export const InjectMailer = () => Inject(MAILER);

/**
 * nodemailer over SMTP: Gmail with an app password, or Resend (host smtp.resend.com, port 465,
 * user "resend", the API key as password, SMTP_FROM on the verified fitr8.com domain).
 */
@Injectable()
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter | null;
  private readonly from: string | undefined;

  constructor(@InjectEnv() env: Env) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = env;
    this.transport =
      SMTP_HOST && SMTP_USER && SMTP_PASS
        ? createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            // Fail the request rather than hang it when the SMTP server is slow or unreachable.
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 20_000,
          })
        : null;
    this.from = env.SMTP_FROM ?? SMTP_USER;
  }

  get enabled() {
    return this.transport !== null;
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transport) throw new Error("SMTP is not configured");
    await this.transport.sendMail({
      from: { name: message.fromName ?? "FITR8 website", address: this.from! },
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
    });
  }
}
