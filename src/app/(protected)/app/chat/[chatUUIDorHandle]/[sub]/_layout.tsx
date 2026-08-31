import { Stack } from "expo-router";

export default function ChatSubLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="overview" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen
        name="media-modal"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
        }}
      />
    </Stack>
  );
}
