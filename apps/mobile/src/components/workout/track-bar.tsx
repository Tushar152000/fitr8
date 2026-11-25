import { View, type ViewProps } from "react-native";
import { makeStyles } from "@/lib/theme";

/** The rounded 14 px bar on a training day (16d): the session's blocks, or the timer's progress. */
export function TrackBar({ style, ...props }: ViewProps) {
  const styles = useStyles();
  return <View {...props} style={[styles.bar, style]} />;
}

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", backgroundColor: c.track },
}));
