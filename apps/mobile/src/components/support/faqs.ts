/**
 * Help & support → FAQs. DRAFT (2026-11-26), written from how the app works today (docs/PREMIUM.md,
 * docs/HEALTH.md, packages/domain nutrition/progress rules): awaiting product review. Keep answers
 * true to the code; update them when limits, prices or flows change.
 */
export const FAQS: { q: string; a: string }[] = [
  {
    q: "How does FITR8 set my calorie and protein targets?",
    a: "From your height, weight, age, sex and activity level we estimate what you burn in a day, then add a deficit or surplus for your goal and pace. Targets never drop below a safe floor (1,500 kcal for men, 1,200 for women, or your resting burn if that is higher). Change your goal and the targets update.",
  },
  {
    q: "How do I log a meal?",
    a: "Tap the camera button. Snap a photo of your plate, scan a barcode or a nutrition label, or tap Type to describe what you ate. Check the items and portions, then save. Meals you eat often can be saved and logged again in one tap.",
  },
  {
    q: "How accurate are photo scans?",
    a: "A photo gives a good estimate of the items and portions, not an exact weight, so check them before saving and fix any portion with one tap. Barcodes and nutrition labels use the values printed on the pack.",
  },
  {
    q: "What's free, and what does Premium add?",
    a: "Free: typing meals, calorie and protein targets, water and weight tracking, 3 custom reminders and Apple Health / Health Connect. Premium adds photo scanning (10 a day), barcode and label scanning, the AI coach (40 messages a day), your weekly workout plan and unlimited reminders.",
  },
  {
    q: "How do I cancel Premium?",
    a: "Premium is billed by the App Store or Google Play, so you cancel it there (Profile → Manage subscription opens the right page). Deleting your FITR8 account does not stop the store billing you.",
  },
  {
    q: "How does my streak work?",
    a: "Your streak counts the days in a row with at least one meal logged. Today joins the streak as soon as you log something, so it doesn't reset before breakfast.",
  },
  {
    q: "Why didn't a reminder ring?",
    a: "Check Settings → Notifications says On; if not, allow notifications for FITR8 in your phone's settings. Reminders are scheduled on this phone, so after reinstalling or changing phones, open FITR8 once to set them up again.",
  },
  {
    q: "What does FITR8 read from Apple Health or Health Connect?",
    a: "Only what you allow, and read only: FITR8 never changes your health data. It shows your steps, heart rate, BMI, blood oxygen, sleep and recovery, and your coach can use them. Disconnect, or delete everything FITR8 synced, any time from Profile → Apps & devices.",
  },
  {
    q: "Can I export or delete my data?",
    a: "Yes. Settings → Privacy & data exports your meals and weigh-ins as a CSV file. Settings → Account → Delete account removes your account and all your data for good.",
  },
  {
    q: "Is FITR8 medical advice?",
    a: "No. FITR8 gives general fitness and nutrition guidance. If you have a medical condition, are pregnant, or take medication that affects your diet, check with your doctor before changing how you eat or train.",
  },
];
