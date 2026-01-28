import React, { useContext } from "react";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "@/context/ThemeContext";

const MyStatusBar = ({
  backgroundColor,
  translucent,
  hidden = false,
}) => {
  const { theme } = useContext(ThemeContext);

  return (
    <StatusBar
      style={theme.statusBarTextColor}
      backgroundColor={backgroundColor}
      translucent={translucent}
      hidden={hidden}
    />
  );
};

export default MyStatusBar;
