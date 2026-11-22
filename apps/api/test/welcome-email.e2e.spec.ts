import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp, onboard, type TestApp } from "./support/app.js";

/** The welcome email is queued when an account is created and sent in the background. */
describe("welcome email", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(() => {
    t.mail.enabled = true;
    t.mail.fail = false;
  });

  const sentTo = (to: string) => t.mail.sent.filter((m) => m.to === to);
  const sentAt = async (email: string) =>
    (await t.prisma.user.findUniqueOrThrow({ where: { email } })).welcomeEmailSentAt;
  const settle = () => new Promise((r) => setTimeout(r, 200));

  /** The real web flow: /api/auth/google → Google → /api/auth/callback/google. */
  async function googleSignIn(identity: { subject?: string; email: string; name?: string }) {
    const agent = t.browser();
    const start = await agent.get("/api/auth/google?returnTo=%2Fhome").expect(302);
    const url = new URL(start.headers.location as string);
    const code = t.google.issueCode(
      { ...identity, nonce: url.searchParams.get("nonce") },
      url.searchParams.get("code_challenge")!,
    );
    const back = await agent
      .get("/api/auth/callback/google")
      .query({ code, state: url.searchParams.get("state") })
      .expect(302);
    expect(new URL(back.headers.location as string).pathname).toBe("/home");
    return agent;
  }

  it("goes out on the first Google sign-in, to the Google email, by first name", async () => {
    const email = `${randomBytes(6).toString("hex")}@gmail.test`;
    await googleSignIn({ email, name: "Asha Verma" });

    await vi.waitFor(() => expect(sentTo(email)).toHaveLength(1));
    const [mail] = sentTo(email);
    expect(mail).toMatchObject({ subject: "Welcome to FITR8, Asha 👋", fromName: "FITR8" });
    expect(mail!.text).toContain("Your account is ready.");
    expect(mail!.text).toContain(`We’ll email you at ${email} the day it’s live.`);
    expect(mail!.html).toContain("Build my plan");
    expect(await sentAt(email)).toBeInstanceOf(Date);
  });

  it("is not sent again when they sign in again or finish onboarding", async () => {
    const email = `${randomBytes(6).toString("hex")}@gmail.test`;
    const subject = `google-${randomUUID()}`;
    const agent = await googleSignIn({ subject, email, name: "Ravi" });
    await vi.waitFor(() => expect(sentTo(email)).toHaveLength(1));

    await googleSignIn({ subject, email, name: "Ravi" });
    await onboard(agent);
    await settle();
    expect(sentTo(email)).toHaveLength(1);
  });

  it("goes out on the local email sign-in too, greeting 'there' instead of the email name", async () => {
    const email = `meera.k.${randomBytes(4).toString("hex")}@test.fitlens`;
    await t.http().post("/api/auth/dev").send({ email }).expect(200);
    await vi.waitFor(() => expect(sentTo(email)).toHaveLength(1));
    expect(sentTo(email)[0]!.subject).toBe("Welcome to FITR8, there 👋");
  });

  it("is written to the log instead when SMTP is off", async () => {
    t.mail.enabled = false;
    const email = `${randomBytes(6).toString("hex")}@gmail.test`;
    await googleSignIn({ email });
    await vi.waitFor(async () => expect(await sentAt(email)).toBeInstanceOf(Date));
    expect(sentTo(email)).toHaveLength(0);
  });

  it("doesn't block sign-in when sending fails, and frees the claim for a retry", async () => {
    t.mail.fail = true;
    const email = `${randomBytes(6).toString("hex")}@gmail.test`;
    const agent = await googleSignIn({ email });
    await agent.get("/api/me").expect(200);
    await settle();
    expect(sentTo(email)).toHaveLength(0);
    expect(await sentAt(email)).toBeNull();
  });
});
