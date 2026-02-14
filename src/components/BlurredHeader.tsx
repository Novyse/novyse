import React from "react";
import { StyleSheet } from "react-native";

import HeaderBase from "./HeaderBase";
import BlurredView from "./BlurredView";

interface BlurredHeaderProps {
  children: React.ReactNode;
  style?: object;
  intensity?: number;
  tint?: "light" | "dark" | "default";
}

const BlurredHeader = ({
  children,
  style,
  intensity,
  tint,
}: BlurredHeaderProps) => {
  const styles = createStyles();
  return (
    <HeaderBase>
      <BlurredView
        style={[styles.container, style]}
        intensity={intensity}
        tint={tint}
      >
        {children}
      </BlurredView>
    </HeaderBase>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 4,
      height: 60,
    },
  });

export default BlurredHeader;
