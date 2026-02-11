import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";

import { useThemeContext } from "@/context/ThemeContext";

import Icon from "@/src/components/Icon";

export default function TabsLayout() {
  const { theme } = useThemeContext();

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: theme.backgroundMainGradient[0] },
        tabBarStyle: {
          position: "absolute",
          bottom: 25,
          left: 20,
          right: 20,
          borderRadius: 30,
          height: 60,
          minWidth: 200,
          maxWidth: 400,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          justifySelf: "center",
        },
        tabBarBackground: () => (
          <BlurView
            intensity={50}
            tint="dark"
            style={{ flex: 1, borderRadius: 30 }}
          />
        ),
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#cccccc",
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          alignSelf: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="ChatIcon" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="SettingsIcon" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon name="UserIcon" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="search" options={{ headerShown: false, href: null }} />
    </Tabs>
  );
}
