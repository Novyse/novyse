import React from "react";
import { View, StyleSheet } from "react-native";
import BlurredView from "./BlurredView";

const HeaderBase = ({ children, style }) => {
  return <View style={[styles.container, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // zIndex: 999,     // don't use this, it breaks on mobile
  },
});

export default HeaderBase;
