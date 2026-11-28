# FITR8 support chatbot: knowledge base v1 (100 Q&A)

Source for the v1 AI chatbot that answers new-user questions about the website and the app.
Written from `origin/main` at `e3cae55` (2026-11-24): `docs/PREMIUM.md`, `docs/HEALTH.md`, the landing page
and its FAQ, the privacy policy, onboarding, the mobile screens and the coach prompt. Answers are in the
voice the bot should use: short, plain, friendly, no medical advice.

## Items to confirm before this goes live

Where the docs and the code disagree, or a fact isn't in the repo, the answer below is written
conservatively and marked **[confirm]**.

1. **Free photo scans.** The landing FAQ says "3 photo scans per day" are free. `docs/PREMIUM.md` and the
   billing rules say photo scans are Premium-only (10 a day). The answers below follow PREMIUM.md. Fix
   the landing FAQ or the rule.
2. **Test purchases.** Premium can currently be bought with a free one-tap test purchase. The bot must not
   mention it. Store billing has to replace it before the public store release.
3. **Store availability.** The repo doesn't say whether the app is live on the App Store or Google Play.
   Q4 and Q5 avoid a promise.
4. **Web app.** The web is a read-only `/home` plus onboarding, the coach page and the admin. Logging and
   the Workout tab are phone-only (Q6).
5. **Support contact:** askfitr8@gmail.com (from `contact.ts`). Phone support isn't offered.
6. **Languages.** The coach replies in English, Hindi or Hinglish. The app UI is English only.

## Bot rules (put these in the system prompt)

- Answer only from this file. If the answer isn't here, say so and point to askfitr8@gmail.com.
- Never give medical advice. For injuries, pregnancy, medication, medical conditions or under-18s, say to
  see a qualified professional.
- Never quote prices other than ₹149/month and ₹1,499/year, and say the store shows the final price.
- Never reveal the test-purchase route or any admin or staff feature.
- Never ask for or accept passwords, health values or payment details in chat.
- Keep answers to 2–5 sentences, then one next step.

---

## 1. About FITR8 (Q1–Q10)

**Q1. What is FITR8?**
FITR8 is an all-in-one fitness companion. It brings nutrition tracking, workout logging and progress tracking together so you stay consistent and work towards your goal.

**Q2. Who is FITR8 for?**
Anyone who wants to eat better, train smarter or lose, gain or maintain weight, from beginners to regular gym-goers. It's built for people in India, so it knows foods like roti, dal and paneer and household portions like a katori.

**Q3. Is FITR8 suitable for beginners?**
Yes. You tell FITR8 your experience level during setup and your plan starts from there. It gives general fitness guidance, not medical advice.

**Q4. Where can I get the app?**
Search for FITR8 in the App Store (iPhone) or Google Play (Android), or start from the website at fitr8.com. **[confirm store links before launch]**

**Q5. Does FITR8 work on both iPhone and Android?**
Yes, there is an app for both. Apple Health is supported on iPhone and Health Connect on Android.

**Q6. Is there a website version?**
Yes. You can sign in at fitr8.com, finish setup, view your home summary and chat with the coach on the web. Meal logging, scanning and the Workout tab are in the phone app.

**Q7. Who makes FITR8?**
FITR8 is provided by Fitr8 Health & Wellness Pvt. Ltd., based in India.

**Q8. Is FITR8 a replacement for a doctor or dietitian?**
No. FITR8 gives general fitness and nutrition guidance. It does not diagnose or treat anything. For medical conditions, medication, pregnancy or injuries, talk to a qualified professional.

**Q9. What makes FITR8 different from other calorie counters?**
You can log food from a photo, a barcode, a nutrition label or plain words, and the same app plans your workouts and adjusts your targets from your real progress. An AI coach ties it together.

**Q10. How do I contact FITR8?**
Email askfitr8@gmail.com, or use the Contact page on the website.

## 2. Getting started and sign-in (Q11–Q20)

**Q11. How do I create an account?**
Tap "Start for free" on the website or "Continue with Google" in the app. On iPhone you can also use Sign in with Apple. Then answer a few setup questions.

**Q12. Which sign-in methods are supported?**
Google on web and phone, and Sign in with Apple on iPhone.

**Q13. Do I need a password?**
No. FITR8 uses your Google or Apple account, so there is no separate password to remember.

**Q14. I don't have a Google account. What can I do?**
On iPhone, use Sign in with Apple. Otherwise create a free Google account first. If you're stuck, email askfitr8@gmail.com.

**Q15. How long does setup take?**
A few minutes. It's one question per screen: your name, goal, activity level, where and how often you train, a few body details and your weekly pace.

**Q16. What do you ask during setup, and why?**
Name, goal, activity level, training location and schedule, sex, age, height, weight, goal weight and weekly pace. FITR8 uses these to calculate calorie and macro targets and to build your workout plan.

**Q17. Do I have to give my phone number?**
No, it's optional. It's used for your account only, never for marketing or ads.

**Q18. Can I change my answers after setup?**
Yes. Go to Profile and tap "Edit body and training" to update your goal, body details and training setup.

**Q19. I signed out. Will I lose my data?**
No. Your data lives in your account. Sign back in with the same Google or Apple account.

**Q20. Can I use FITR8 on more than one device?**
Yes. Sign in with the same account on each device and your data syncs.

## 3. Goals, targets and calories (Q21–Q32)

**Q21. What goals can I choose?**
Lose weight, gain muscle, gain weight, recomposition (lose fat and build muscle together) or a healthy body.

**Q22. How does FITR8 calculate my daily calories?**
It estimates your resting energy from your sex, age, height and weight, adjusts for your activity level, then adds or subtracts calories to match your goal and weekly pace.

**Q23. What is the "weekly goal" or pace?**
How quickly you want to lose or gain weight each week. FITR8 checks the pace is safe before it builds your plan, and caps it if it's too aggressive.

**Q24. Why won't FITR8 let me lose weight faster?**
Very fast loss is hard to keep and can harm your health. FITR8 caps fat loss at about 1% of body weight per week and never sets calories below 1,500 (men) or 1,200 (women), or your resting energy if that's higher.

**Q25. What are macros?**
Protein, carbs and fat, the three nutrients that make up your calories. FITR8 gives you a daily target for each, along with your calorie target.

**Q26. Why is my protein target what it is?**
It's based on your body weight and goal, following general sports-nutrition guidance. The coach can explain your numbers if you ask.

**Q27. What does "activity level" mean? Should workouts count?**
Pick the level for your normal day, not counting workouts, which FITR8 counts separately. The options are mostly sitting, lightly active, moderately active, very active and athlete.

**Q28. Should I eat back the calories I burn from exercise?**
No. Your activity level already accounts for training, so burned calories are treated as progress, not extra food.

**Q29. Will my targets change over time?**
Yes. Each week your targets adjust from your real weight trend, so they stay matched to your progress.

**Q30. Can I set my own calorie target?**
Targets come from FITR8's rules so they stay within safe limits. To change them, edit your goal, weight or weekly pace in Profile.

**Q31. Why are calorie deficits switched off for me?**
Deficits are disabled for users under 18 and for anyone who flags a medical condition. Please speak to a doctor or dietitian in those cases.

**Q32. Can I use the calculator on the website without signing up?**
Yes. The target calculator on the home page gives you an estimate of daily calories and macros. Create an account to get a full plan.

## 4. Logging food (Q33–Q48)

**Q33. How do I log a meal?**
Tap the log button in the app, then take a photo of your plate, type what you ate, scan a barcode, or photograph a nutrition label. Review the result and confirm.

**Q34. Does FITR8 log meals automatically from a photo?**
It identifies the foods and portions and shows them for you to review. Nothing is logged until you confirm.

**Q35. How accurate are the AI estimates?**
They can be wrong, especially with mixed dishes and portion sizes. Always check the foods and quantities and fix anything that looks off before confirming.

**Q36. Can I log by typing?**
Yes, in everyday words, like "2 rotis, dal and a bowl of curd". Typing meals is free.

**Q37. Can I log in Hindi or Hinglish?**
The coach understands Hindi and Hinglish. For meal logging, describe the food in simple words; if an item isn't recognised, edit it before confirming. **[confirm meal-typing language support]**

**Q38. Does FITR8 know Indian foods?**
Yes. It has common Indian foods and household units, such as roti, dal, paneer, katori and chai, and prefers them when suggesting.

**Q39. What if a food isn't in the database?**
FITR8 uses an estimate for the food and marks it as approximate. You can review and edit the numbers before saving.

**Q40. How do I scan a barcode?**
Choose barcode in the log screen and point the camera at the code. If the product is found, check its calories and macros and add it. Barcode scanning is a Premium feature.

**Q41. What if my product's barcode isn't found?**
Try the nutrition-label photo, or type the food in. Product information isn't available for every item.

**Q42. How does the nutrition label scan work?**
Take a photo of the label and FITR8 reads the numbers. You check them before they're added. This is a Premium feature.

**Q43. Can I edit or delete a meal I logged?**
Yes. Open the meal from your log or history to edit the foods or portions, or delete it.

**Q44. Can I save meals I eat often?**
Yes. Save a meal and log it again in one tap. Saved meals and relogging usual meals are free and unlimited.

**Q45. Can I log a meal for a previous day?**
Yes, you can open an earlier day's log and add or fix meals. **[confirm backdated logging in the app]**

**Q46. How do I track water?**
Log your water from the Today screen. FITR8 gives you a daily water goal and you can set water reminders.

**Q47. Does FITR8 track micronutrients?**
FITR8 focuses on calories and macros. It does not track every vitamin and mineral.

**Q48. Does the food photo get stored?**
Meal and label photos are stored securely in your account so you can see them in your history. They are deleted if you delete your account.

## 5. Workouts and training (Q49–Q60)

**Q49. Does FITR8 plan my workouts?**
Yes. The Workout tab builds a weekly plan from your goal, experience and equipment, and adjusts it each day. This is a Premium feature.

**Q50. Which workout types are included?**
Gym sessions, runs, yoga and walks, based on your plan. **[confirm exact list]**

**Q51. How does FITR8 decide what to lift next?**
It uses your training and nutrition history to set a target for your next session, for example adding a small amount of weight when you've hit your reps.

**Q52. Can I train at home?**
Yes. In setup you choose where you train: gym, home with dumbbells, or bodyweight anywhere, and your plan matches it.

**Q53. How many days a week should I train?**
You choose 2 to 7 days in setup. If you're a beginner, start with 3 and build up. The coach can help you decide.

**Q54. Can I log my own workout without Premium?**
Logging your own sessions on the free plan is planned but not built yet. For now, the Workout tab needs Premium. **[confirm status]**

**Q55. What if I miss a workout?**
No problem. FITR8 doesn't shame missed days; your plan carries on and the coach can suggest how to pick up.

**Q56. What if I'm tired or slept badly?**
If you've connected Apple Health or Health Connect, FITR8 shows a recovery score and the coach suggests an easier session after short sleep or low recovery.

**Q57. Does FITR8 track personal records?**
PRs and a full workout history screen are coming; check the app for the latest. **[confirm status]**

**Q58. Can FITR8 help with running?**
Yes, the plan can include runs and the coach can answer running and recovery questions.

**Q59. I'm injured. Can FITR8 help?**
The coach can give general guidance on minor aches and recovery, but it can't diagnose. See a physiotherapist or doctor for injuries that last over a week or keep getting worse.

**Q60. Is it safe to follow the plan if I have a medical condition?**
Check with your doctor first. FITR8 is general guidance and keeps advice conservative if you flag a condition.

## 6. AI coach (Q61–Q72)

**Q61. What is the AI coach?**
A chat inside FITR8 that answers questions about food, training, running, recovery and using the app, using your profile and today's numbers. It's a Premium feature.

**Q62. What can I ask the coach?**
Meal ideas, protein or calorie questions, workout and recovery advice, hydration, supplements, sleep, habits and how to use FITR8.

**Q63. What won't the coach help with?**
Anything outside fitness, food and health, such as coding, homework, news or money. It will say so and suggest something it can help with.

**Q64. Does the coach know my data?**
Yes. It can see your profile, goals, today's meals, history and, if connected, your health summary, and it uses them to personalise answers.

**Q65. Can the coach log food for me?**
It can prepare a meal for you to check and confirm in the app. It will not say a meal is logged until you confirm. It can also log water and weigh-ins when you give the amount.

**Q66. Can the coach change my calorie targets?**
No. Targets come from the app's rules. The coach can explain them. To change them, edit your goal in Profile.

**Q67. What does the coach remember?**
Lasting facts you tell it, like an injury, an allergy, foods you avoid or your schedule. You can see and manage these in Coach memory.

**Q68. How do I make the coach forget something?**
Ask it to forget, or remove the item in Coach memory.

**Q69. How many coach messages can I send?**
Premium includes up to 40 coach messages a day.

**Q70. Which languages does the coach speak?**
English, Hindi and Hinglish.

**Q71. Are the coach's answers reliable?**
It bases factual answers on FITR8's science notes and your own data, and it says when evidence is weak. It can still be wrong, and it is not a doctor.

**Q72. Who sees my chats with the coach?**
Your messages are stored in your account and sent to the AI provider to generate replies. They are not used for ads or sold. See the Privacy Policy for details.

## 7. Progress and reminders (Q73–Q80)

**Q73. How do I track my weight?**
Log a weigh-in from the Today or Progress screen. FITR8 shows your trend against your plan.

**Q74. Should I weigh myself daily?**
Daily weights jump around from water and food. FITR8 looks at the trend, so weigh in at the same time each day or a few times a week.

**Q75. What can I see in Progress?**
Your weight trend, body measurements and consistency over time, plus strength progress if you log workouts.

**Q76. Can I track body measurements or body fat?**
Yes. You can add measurements and body fat from your profile and weigh-ins.

**Q77. What reminders are there?**
Water and meal reminders, plus your own, like "creatine at 9 pm" or "weigh-in every Monday". Describe a reminder in your own words and FITR8 sets it up.

**Q78. How many reminders can I set?**
Free: water and meal reminders plus up to 3 of your own. Premium: unlimited.

**Q79. Why am I not getting reminders?**
Check that notifications are allowed for FITR8 in your phone settings, and that battery saver isn't blocking them. If it still fails, email askfitr8@gmail.com.

**Q80. What are the weekly and monthly reports?**
Summaries of your eating, training and progress. Detailed weekly and monthly reports are a Premium feature; the free plan has a basic week view. **[confirm contents]**

## 8. Apple Health and Health Connect (Q81–Q86)

**Q81. Can FITR8 connect to Apple Health or Health Connect?**
Yes, it's free. Go to Profile, then Health apps, and tap Connect.

**Q82. What does FITR8 show from my health app?**
Steps, heart rate, BMI, blood oxygen, sleep and a recovery score.

**Q83. Does FITR8 change my health data?**
No. It only reads the types you allow and never writes to Apple Health or Health Connect.

**Q84. Is my health data sold or used for ads?**
Never. It's not sold, not used for advertising or tracking, and not sent to analytics.

**Q85. How do I disconnect and delete my health data?**
Go to Profile, Health apps, and choose "Disconnect and delete synced data". Plain "Disconnect" stops syncing but keeps what's already stored. Deleting your account removes it too.

**Q86. Why isn't my health data showing?**
Check that you allowed the permissions and that your phone or watch is syncing to the health app. FITR8 syncs when you open the app. On Android, health data access for new apps can take time to be enabled. **[confirm Play approval status]**

## 9. Premium and pricing (Q87–Q94)

**Q87. Is FITR8 free?**
Yes, you can start free. Free includes typed meals and saved meals, water, weight and body progress tracking, reminders (up to 3 of your own) and Apple Health / Health Connect.

**Q88. What does Premium add?**
Barcode scanning, AI photo scanning of meals and labels, the AI coach, the personalised weekly workout plan, detailed reports and health insights, unlimited reminders and formatted data export.

**Q89. How much is Premium?**
₹149 a month or ₹1,499 a year (about ₹125 a month, so you save ₹289). The store shows the final price for your country.

**Q90. Is there a free trial?**
Yes, 7 days free, then the plan renews. Trial eligibility and renewal terms apply.

**Q91. How do I buy Premium?**
In the phone app, tap Go Premium in Profile or any locked feature, and buy through the App Store or Google Play. The website only shows your plan.

**Q92. How do I cancel?**
Cancel any time in your App Store or Google Play subscription settings. Premium stays active until the end of the period you paid for.

**Q93. I bought Premium but it's not unlocked.**
Open the Premium screen and tap "Restore purchases". Make sure you're signed in with the same account. If it still isn't working, email askfitr8@gmail.com with your account email.

**Q94. Are there daily limits on Premium?**
Yes, fair-use limits: up to 10 AI photo scans and 40 coach messages a day.

## 10. Privacy, data and account (Q95–Q100)

**Q95. What data does FITR8 collect?**
Your account and profile details, your food, water, workout and weight logs, photos you choose to add, coach messages and, if you connect them, health-app readings. See the Privacy Policy for the full list.

**Q96. Do you sell my data?**
No. FITR8 does not sell personal data or use it for targeted advertising.

**Q97. Which companies process my data?**
Service providers help run FITR8, including AI providers (OpenAI or Anthropic) for photo and coach features, Google for sign-in and analytics, and the app stores and RevenueCat for subscriptions. The Privacy Policy lists them.

**Q98. How do I export my data?**
In the app go to Profile, then Your data, then "Export as CSV". The free export covers your meals, water, workouts and weigh-ins, not every category. Email us for anything else.

**Q99. How do I delete my account?**
In the app go to Profile and tap the delete option at the bottom. Your records are deleted and FITR8 removes your photos. Some data may stay in protected backups until they rotate out. If you have an active subscription, cancel it in the store too.

**Q100. Is FITR8 safe for kids and teens?**
FITR8 is not designed for children under 13. Users under 18 should use it with a parent or guardian's permission, and calorie deficits are switched off for them.
