import { Share } from "react-native";

/** The public website; it links to both stores. */
export const INVITE_URL = "https://www.fitr8.com";

/**
 * Profile "Invite a friend": the system share sheet with a short note and the website link. A
 * dismissed sheet or a browser without Web Share is not an error.
 */
export async function inviteFriend(): Promise<void> {
  const message = `I'm using FITR8 to track my meals and hit my goals. Try it free: ${INVITE_URL}`;
  try {
    await Share.share({ message, url: INVITE_URL, title: "Try FITR8" });
  } catch {
    // Nothing to do: the user closed the sheet, or sharing isn't available here.
  }
}
