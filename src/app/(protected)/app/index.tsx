import React from "react";
import { View, Text } from "react-native";

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
      <Text style={{ fontSize: 18, color: "white" }}>Nothing selected.</Text>
    </View>
  );
}
