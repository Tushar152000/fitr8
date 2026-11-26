import { Platform } from "react-native";

/**
 * Web only: no browser focus ring (the default blue outline) on text fields and buttons. Focus is
 * shown the app's way instead (TextField / NumberField borders turn ink; user decision 2026-11-27),
 * and the caret uses the brand olive.
 */
if (Platform.OS === "web" && typeof document !== "undefined") {
  const id = "fitr8-web-styles";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = [
      "input, textarea, [contenteditable] { outline: none !important; caret-color: #718b00; }",
      "input:focus, textarea:focus, [role=button]:focus, [tabindex]:focus { outline: none !important; }",
      // Keyboard users still see where they are: a soft olive ring on buttons reached with Tab.
      "[role=button]:focus-visible, [role=switch]:focus-visible, [role=radio]:focus-visible, [role=tab]:focus-visible { outline: 2px solid rgba(113,139,0,0.45) !important; outline-offset: 2px; }",
    ].join("\n");
    document.head.appendChild(style);
  }
}
