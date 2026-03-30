import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HeaderBaseProps {
  children: React.ReactNode;
  style?: object;
}

const HeaderBase = ({ children, style }: HeaderBaseProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, style, { top: insets.top }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    gap: 10,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    position: "absolute",
    zIndex: 1,
  },
});

export default HeaderBase;
