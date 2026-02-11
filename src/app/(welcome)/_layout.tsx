import React from "react";
import { Stack } from "expo-router";

export default function WelcomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="email-check" options={{ headerShown: false }} />
    </Stack>
  );
}
