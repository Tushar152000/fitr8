import { FileText, Shield } from "lucide-react-native";
import { ExportRow } from "@/components/profile/export-row";
import { ProfilePage } from "@/components/profile/profile-page";
import { MenuGroup, MenuRow } from "@/components/ui";
import { openLegal } from "@/lib/legal";

/**
 * Settings → Privacy & data: export everything as CSV, and the privacy policy and terms (in-app
 * browser). Deleting the account is under Account.
 */
export default function PrivacyScreen() {
  return (
    <ProfilePage
      title="Privacy & data"
      eyebrow="Settings"
      intro="Download a copy of your data, or read how FITR8 looks after it."
    >
      <MenuGroup>
        <ExportRow />
      </MenuGroup>
      <MenuGroup>
        <MenuRow icon={Shield} title="Privacy policy" onPress={() => void openLegal("privacy")} />
        <MenuRow icon={FileText} title="Terms of use" onPress={() => void openLegal("terms")} />
      </MenuGroup>
    </ProfilePage>
  );
}
