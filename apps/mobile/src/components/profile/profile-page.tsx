import type { ReactNode } from "react";
import { View } from "react-native";
import { PageHeader, Screen, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/**
 * The frame every Profile page shares (Figma "Profile / …"): content 8 px under the status bar (Screen), the
 * Top Bar (round back, eyebrow, H1 title) with an optional intro line 12 below it (Body/Regular,
 * secondary), then the page's groups 24 px apart.
 */
export function ProfilePage({
  title,
  eyebrow = "Profile",
  intro,
  children,
  footer,
  refreshing,
  onRefresh,
  tabBar,
  onBack,
}: {
  title: string;
  eyebrow?: string | null;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  tabBar?: boolean;
  onBack?: () => void;
}) {
  const c = useColors();
  return (
    <Screen tabBar={tabBar} footer={footer} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ gap: 12 }}>
        <PageHeader title={title} eyebrow={eyebrow ?? undefined} onBack={onBack} />
        {intro ? (
          <Text variant="bodySm" color={c.ink2}>
            {intro}
          </Text>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}
