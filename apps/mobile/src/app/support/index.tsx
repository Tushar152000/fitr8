import { router } from "expo-router";
import { CircleHelp, MessageCircle, MessageSquare } from "lucide-react-native";
import { ProfilePage } from "@/components/profile/profile-page";
import { MenuGroup, MenuRow } from "@/components/ui";
import { emailSupport } from "@/lib/support";

/** Figma frame 14 "Profile / Help & support": FAQs, chat (email) with support, send feedback. */
export default function SupportScreen() {
  return (
    <ProfilePage title="Help & support" intro="We usually reply within a few hours.">
      <MenuGroup>
        <MenuRow icon={CircleHelp} title="FAQs" onPress={() => router.push("/support/faq")} />
        <MenuRow
          icon={MessageSquare}
          title="Chat with support"
          subtitle="Usually replies in a few hours"
          accessibilityLabel="Chat with support by email, usually replies in a few hours"
          onPress={() => void emailSupport()}
        />
        <MenuRow icon={MessageCircle} title="Send feedback" onPress={() => router.push("/support/feedback")} />
      </MenuGroup>
    </ProfilePage>
  );
}
