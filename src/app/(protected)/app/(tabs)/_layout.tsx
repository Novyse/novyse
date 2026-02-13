import { Tabs } from "expo-router";

import { useThemeContext } from "@/context/ThemeContext";

import TabBar from "@/src/components/TabBar";
import Icon from "@/src/components/Icon";

export default function TabsLayout() {
  const { theme } = useThemeContext();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        sceneStyle: { backgroundColor: theme.backgroundMainGradient[0] },
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
