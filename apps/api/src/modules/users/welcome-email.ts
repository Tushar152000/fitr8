/**
 * The one-time welcome email, sent when a new account is created (first sign-in with Google,
 * Apple, or the local dev login). We only know the name and email at that point, so the copy
 * invites them to build their plan rather than describing it. Never put weight, measurements or
 * medical details in here.
 *
 * The HTML is built for email clients, not browsers: table layout, inline styles (a <style> block
 * only adds the phone-width tweaks for clients that support it), a bulletproof button, light colour
 * scheme pinned so dark-mode clients don't invert the brand purple, and a plain-text twin.
 */

/** Queue the welcome email job listens on (`WelcomeEmailJob`). */
export const WELCOME_EMAIL_QUEUE = "welcome-email";

export interface WelcomeEmailData {
  userId: string;
}

/** Flip to true once the iPhone and Android apps are live in the stores. */
export const APPS_IN_STORES = false;
/** Placeholder until the account is claimed. */
export const INSTAGRAM_HANDLE = "fitr8_official";

export interface WelcomeEmailInput {
  /** Display name from the sign-in provider; the first word is used, else "there". */
  name: string | null;
  email: string;
  /** Web origin, e.g. https://www.fitr8.com. */
  publicUrl: string;
}

export interface WelcomeEmail {
  subject: string;
  text: string;
  html: string;
}

/** Inbox preview line (shown after the subject). */
const PREVIEW = "Your account is ready. Build your plan in about a minute.";

const TIPS: { title: string; body: string }[] = [
  {
    title: "Snap your first meal",
    body: "Take a photo of your next meal. FITR8 spots the foods and portions, you confirm, and it’s logged. No typing, no searching.",
  },
  {
    title: "Watch your ring fill up",
    body: "Your daily calorie and protein targets live on the Today screen. Aim to log every meal for three days: roughly every day beats perfectly once a week.",
  },
  {
    title: "Ask your coach anything",
    body: "Not sure what to eat for dinner, or why the scale went up? The FITR8 coach knows your plan and your logs, so its answers are about you.",
  },
  {
    title: "Check in once a week",
    body: "Each week FITR8 asks how it went and adjusts your plan as you progress.",
  },
];

/** Brand palette (matches the web app's tokens). */
const C = {
  brand: "#8116e0",
  brandSoft: "#f3eafd",
  ink: "#15111f",
  ink2: "#4b4659",
  ink3: "#8a8597",
  line: "#ebe8f0",
  ground: "#f5f3f8",
  white: "#ffffff",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** First word of the display name, or "there". */
export function firstName(name: string | null): string {
  return name?.trim().split(/\s+/)[0] || "there";
}

export function welcomeEmail(input: WelcomeEmailInput): WelcomeEmail {
  const name = firstName(input.name);
  const origin = input.publicUrl.replace(/\/+$/, "");
  const links = {
    // /home sends anyone not onboarded yet to onboarding, members to their plan.
    app: `${origin}/home`,
    privacy: `${origin}/privacy`,
    site: origin,
    instagram: `https://www.instagram.com/${INSTAGRAM_HANDLE}`,
  };
  const siteLabel = origin.replace(/^https?:\/\/(www\.)?/, "");
  const subject = `Welcome to FITR8, ${name} 👋`;
  const intro =
    "Thanks for joining FITR8. Your account is ready. Next, tell us your goal and we’ll set your daily calorie and protein targets, built around you.";
  const appsNote = `The FITR8 app for iPhone and Android is coming soon. We’ll email you at ${input.email} the day it’s live. Until then, everything works on the web.`;
  const footer = [
    "You’re receiving this because you created a FITR8 account.",
    "FITR8 gives general guidance, not medical advice.",
  ];

  const text = [
    `Hi ${name},`,
    intro,
    `Build my plan: ${links.app}`,
    "MAKE YOUR FIRST WEEK COUNT",
    ...TIPS.map((t, i) => `${i + 1}. ${t.title}\n${t.body}`),
    ...(APPS_IN_STORES ? [] : [appsNote]),
    `For meal ideas, tips and updates, follow us on Instagram: @${INSTAGRAM_HANDLE} (${links.instagram})`,
    "Glad to have you with us,\nThe FITR8 team",
    "P.S. Just reply to this email if anything’s unclear. We read every reply.",
    "—",
    ...footer,
    `Instagram: ${links.instagram}\nPrivacy policy: ${links.privacy}\n${links.site}`,
  ].join("\n\n");

  const e = escapeHtml;
  const para = (body: string, extra = "") =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:26px;color:${C.ink2};${extra}">${body}</p>`;

  const tipRows = TIPS.map(
    (t, i) => `<tr>
<td valign="top" width="44" style="padding:0 0 22px;">
<div style="width:32px;height:32px;line-height:32px;border-radius:16px;background:${C.brandSoft};color:${C.brand};font-family:${FONT};font-size:15px;font-weight:700;text-align:center;">${i + 1}</div>
</td>
<td valign="top" style="padding:4px 0 22px;">
<p style="margin:0 0 4px;font-family:${FONT};font-size:16px;line-height:22px;font-weight:700;color:${C.ink};">${e(t.title)}</p>
<p style="margin:0;font-family:${FONT};font-size:15px;line-height:23px;color:${C.ink2};">${e(t.body)}</p>
</td>
</tr>`,
  ).join("\n");

  const button = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
<tr><td align="center" bgcolor="${C.brand}" style="border-radius:999px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${e(links.app)}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="50%" stroke="f" fillcolor="${C.brand}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Build my plan</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${e(links.app)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;line-height:22px;font-weight:700;color:${C.white};text-decoration:none;border-radius:999px;">Build my plan<span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:22px;font-weight:700;padding-left:8px;">&rarr;</span></a><!--<![endif]-->
</td></tr>
</table>`;

  const appsCallout = APPS_IN_STORES
    ? ""
    : `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:6px 0 28px;">
<tr><td style="background:${C.brandSoft};border-radius:12px;padding:16px 18px;">
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.ink2};"><strong style="color:${C.ink};">The FITR8 app is coming soon.</strong> We’ll email you at <span style="color:${C.ink};">${e(input.email)}</span> the day it’s live on iPhone and Android. Until then, everything works on the web.</p>
</td></tr>
</table>`;

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
:root { color-scheme: light; supported-color-schemes: light; }
body { margin:0 !important; padding:0 !important; width:100% !important; }
a { color:${C.brand}; }
@media only screen and (max-width:620px) {
  .px { padding-left:24px !important; padding-right:24px !important; }
  .h1 { font-size:26px !important; line-height:32px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.ground};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${e(PREVIEW)}${"&#847;&zwnj;&nbsp;".repeat(60)}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${C.ground};">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;">

<tr><td class="px" style="padding:0 40px 20px;">
<span style="font-family:${FONT};font-size:24px;line-height:28px;font-weight:800;letter-spacing:-0.5px;color:${C.ink};">FIT<span style="color:${C.brand};">R8</span></span>
</td></tr>

<tr><td style="background:${C.white};border-radius:16px;border:1px solid ${C.line};">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
<tr><td style="height:6px;line-height:6px;font-size:0;background:${C.brand};border-radius:16px 16px 0 0;">&nbsp;</td></tr>
<tr><td class="px" style="padding:40px 40px 8px;">
<h1 class="h1" style="margin:0 0 18px;font-family:${FONT};font-size:30px;line-height:36px;font-weight:800;letter-spacing:-0.6px;color:${C.ink};">Welcome to FITR8, ${e(name)}</h1>
${para(e(intro))}
${button}
<p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.ink3};">Takes about a minute. You can change it any time.</p>
</td></tr>

<tr><td class="px" style="padding:32px 40px 0;">
<div style="height:1px;line-height:1px;font-size:0;background:${C.line};">&nbsp;</div>
</td></tr>

<tr><td class="px" style="padding:30px 40px 6px;">
<p style="margin:0 0 22px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.brand};">Make your first week count</p>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
${tipRows}
</table>
${appsCallout}
${para(`For meal ideas, tips and updates, follow us on Instagram: <a href="${e(links.instagram)}" style="color:${C.brand};font-weight:600;text-decoration:none;">@${e(INSTAGRAM_HANDLE)}</a>`)}
${para(`Glad to have you with us,<br><strong style="color:${C.ink};">The FITR8 team</strong>`, "margin-bottom:24px;")}
</td></tr>

<tr><td class="px" style="padding:20px 40px 32px;border-top:1px solid ${C.line};">
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.ink3};"><strong style="color:${C.ink2};">P.S.</strong> Just reply to this email if anything’s unclear. We read every reply.</p>
</td></tr>
</table>
</td></tr>

<tr><td class="px" align="center" style="padding:28px 40px 8px;">
<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:20px;">
<a href="${e(links.instagram)}" style="color:${C.ink2};text-decoration:none;font-weight:600;">Instagram</a>
<span style="color:${C.ink3};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
<a href="${e(links.privacy)}" style="color:${C.ink2};text-decoration:none;font-weight:600;">Privacy policy</a>
<span style="color:${C.ink3};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
<a href="${e(links.site)}" style="color:${C.ink2};text-decoration:none;font-weight:600;">${e(siteLabel)}</a>
</p>
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:19px;color:${C.ink3};">${footer.map(e).join("<br>")}</p>
</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
