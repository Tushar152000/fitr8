/**
 * The admin's Feedback section (/admin/feedback): in-app feedback from users. Messages can hold
 * personal details and carry the sender's email, so only admins read them.
 */
import type { StaffRole } from "./staff.js";

export type FeedbackAction =
  /** List and read users' feedback. */
  "read";

export function feedbackCan(role: StaffRole, action: FeedbackAction): boolean {
  switch (action) {
    case "read":
      return role === "ADMIN";
  }
}
