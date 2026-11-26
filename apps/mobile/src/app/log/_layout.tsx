import { AppStack } from "@/components/app-stack";
import { useColors } from "@/lib/theme";
import { stackBackground, stackMotion } from "@/lib/motion";

export default function LogLayout() {
  const c = useColors();
  return <AppStack screenOptions={{ headerShown: false, ...stackBackground(c.ground), ...stackMotion }} />;
}
