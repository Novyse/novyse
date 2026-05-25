import { Platform } from "react-native";
import { getPlatform } from "@/src/utils/device/type";

/**
 * Returns the unified scrollbar style object for Web and Desktop.
 * Returns an empty object for other platforms.
 */
export const ScrollBar = (theme: any) => {
  const platform = getPlatform();

  // Control: return style only on Web or Desktop
  if (platform !== "web" && platform !== "desktop" && Platform.OS !== "web") {
    return {};
  }

  return {
    scrollbarWidth: "thin" as const,
    scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

    "::WebkitScrollbar": {
      width: 6,
      height: 6,
      backgroundColor: theme.backgroundScrollbar,
    },
    "::WebkitScrollbarTrack": {
      backgroundColor: theme.backgroundScrollbar,
      borderRadius: 3,
    },
    "::WebkitScrollbarThumb": {
      backgroundColor: theme.scrollbar,
      borderRadius: 3,
    },
    "::WebkitScrollbarThumb:hover": {
      backgroundColor: theme.scrollbarHover,
    },

    "::-webkit-scrollbar": {
      width: 6,
      height: 6,
    },
    "::-webkit-scrollbar-button": {
      display: "none",
      width: 0,
      height: 0,
    },
    "::-webkit-scrollbar-track": {
      background: theme.backgroundScrollbar,
      borderRadius: 3,
    },
    "::-webkit-scrollbar-thumb": {
      background: theme.scrollbar,
      borderRadius: 3,
    },
    "::-webkit-scrollbar-thumb:hover": {
      background: theme.scrollbarHover,
    },
  };
};
