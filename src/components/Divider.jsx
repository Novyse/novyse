import React from "react";
import { View } from "react-native";

export default function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: "rgba(255,255,255,0.05)",
        marginVertical: 24,
      }}
    />
  );
}
