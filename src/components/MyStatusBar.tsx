import React from "react";
import { StatusBar } from "expo-status-bar";

interface MyStatusBarProps {
  hidden?: boolean;
  style?: "auto" | "inverted" | "light" | "dark";
  backgroundColor?: string;
  translucent?: boolean;
}

const MyStatusBar = ({
  hidden = false,
  style = "auto",
  backgroundColor,
  translucent,
}: MyStatusBarProps) => {
  return (
    <StatusBar
      style={style}
      hidden={hidden}
      backgroundColor={backgroundColor}
      translucent={translucent}
    />
  );
};

export default MyStatusBar;
