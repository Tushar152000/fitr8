import { describe, expect, it } from "vitest";
import { firstName, welcomeEmail } from "./welcome-email.js";

const base = { name: "Asha Verma", email: "asha@example.com", publicUrl: "https://www.fitr8.com/" };

describe("welcome email", () => {
  it("greets by first name, or 'there'", () => {
    expect(firstName("Asha Verma")).toBe("Asha");
    expect(firstName("  ")).toBe("there");
    expect(firstName(null)).toBe("there");
    const mail = welcomeEmail(base);
    expect(mail.subject).toBe("Welcome to FITR8, Asha 👋");
    expect(mail.text.startsWith("Hi Asha,")).toBe(true);
  });

  it("invites them to build their plan, linking to the web app", () => {
    const mail = welcomeEmail(base);
    expect(mail.text).toContain("Your account is ready.");
    expect(mail.text).toContain("Build my plan: https://www.fitr8.com/home");
    expect(mail.html).toContain('href="https://www.fitr8.com/home"');
    expect(mail.html).toContain('href="https://www.fitr8.com/privacy"');
    expect(mail.html).toContain(">fitr8.com</a>");
    expect(mail.text).toContain("We’ll email you at asha@example.com the day it’s live.");
  });

  it("escapes HTML in the name", () => {
    const html = welcomeEmail({ ...base, name: "<b>x</b>" }).html;
    expect(html).toContain("Welcome to FITR8, &lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<b>x</b>");
  });
});
