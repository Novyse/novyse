import React, { useContext } from "react";
import { View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";

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
      <Typography
        style={{ fontSize: 18, color: theme.text }}
        translationKey="layout.nothingSelected"
      />
    </View>
  );
}
