import React from "react";
import { StatusBar } from "expo-status-bar";

interface MyStatusBarProps {
  hidden?: boolean;
}

const MyStatusBar = ({
  hidden = false,
}: MyStatusBarProps) => {

  return (
    <StatusBar
      style={"auto"}
      hidden={hidden}
    />
  );
};

export default MyStatusBar;