import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageHeader, Screen, Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/**
 * The frame every Profile page shares (Figma "Profile / …"): content 8 px under the status bar, the
 * Top Bar (round back, eyebrow, H1 title), an optional intro line (Body/Regular, secondary), then
 * the page's groups 24 px apart.
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
  const insets = useSafeAreaInsets();
  return (
    <Screen
      tabBar={tabBar}
      footer={footer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentStyle={{ paddingTop: insets.top + 8 }}
    >
      <PageHeader title={title} eyebrow={eyebrow ?? undefined} onBack={onBack} />
      {intro ? (
        <Text variant="bodySm" color={c.ink2}>
          {intro}
        </Text>
      ) : null}
      {children}
    </Screen>
  );
}
