import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { InjectEnv, type Env } from "../../config/config.module.js";
import { InjectMailer, type Mailer } from "../../infra/mail/mailer.js";
import { JobQueue, type JobHandler } from "../../infra/queue/job-queue.service.js";
import { UsersService } from "./users.service.js";
import { WELCOME_EMAIL_QUEUE, welcomeEmail, type WelcomeEmailData } from "./welcome-email.js";

/**
 * Sends the welcome email once per account, right after it is created (`UsersService.create`
 * queues it). Idempotent: the send is claimed on the user row first (`users.welcomeEmailSentAt`),
 * so a duplicate job sends nothing; a failed send gives the claim back and rethrows so the queue
 * retries (3 attempts with Redis). Without SMTP (local dev) the email is written to the log.
 */
@Injectable()
export class WelcomeEmailJob implements JobHandler<WelcomeEmailData>, OnModuleInit {
  readonly queue = WELCOME_EMAIL_QUEUE;
  readonly concurrency = 2;
  private readonly logger = new Logger(WelcomeEmailJob.name);

  constructor(
    private readonly jobs: JobQueue,
    private readonly users: UsersService,
    @InjectMailer() private readonly mailer: Mailer,
    @InjectEnv() private readonly env: Env,
  ) {}

  onModuleInit() {
    this.jobs.register(this);
  }

  async handle({ userId }: WelcomeEmailData) {
    const to = await this.users.claimWelcomeEmail(userId);
    if (!to) return;

    // The dev login names people after their email ("asha.v" from asha.v@…): not a real name.
    const localPart = to.email.split("@")[0];
    const email = welcomeEmail({
      name: to.name && to.name !== localPart ? to.name : null,
      email: to.email,
      publicUrl: this.env.PUBLIC_URL,
    });

    if (!this.mailer.enabled) {
      this.logger.log(
        `Welcome email (not sent: SMTP is not configured)\nTo: ${to.email}\nSubject: ${email.subject}\n\n${email.text}`,
      );
      return;
    }

    try {
      await this.mailer.send({
        to: to.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        fromName: "FITR8",
      });
      this.logger.log(`Welcome email sent to user ${userId}`);
    } catch (err) {
      await this.users.releaseWelcomeEmail(userId);
      throw err;
    }
  }
}
