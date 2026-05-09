import React, {useContext} from "react";
import { View } from "react-native";
import AppText from "@/src/components/AppText";
import {ThemeContext} from "@/context/ThemeContext";

export default function RootLayout() {
  const { theme } = useContext(ThemeContext);
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
      }}
    >
      <AppText
        style={{ fontSize: 18, color: theme.text }}
        translationKey="layout.nothingSelected"
      />
    </View>
  );
}
