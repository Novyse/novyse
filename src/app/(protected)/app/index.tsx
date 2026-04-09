import React from "react";
import { View } from "react-native";
import AppText from "@/src/components/AppText";

export default function RootLayout() {
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
        style={{ fontSize: 18, color: "white" }}
        translationKey="layout.nothingSelected"
      />
    </View>
  );
}
