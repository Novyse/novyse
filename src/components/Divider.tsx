import React, { useContext } from "react";
import { View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

export default function Divider() {
  const { theme } = useContext(ThemeContext);
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.backgroundCard,
        marginVertical: 24,
      }}
    />
  );
}
