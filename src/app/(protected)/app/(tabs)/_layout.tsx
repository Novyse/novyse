import { StyleSheet, View } from "react-native";

import { Tabs } from "expo-router";

import { useThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";

import TabBar from "@/src/components/TabBar";
import Icon from "@/src/components/Icon";

import BlurredView from "@/src/components/BlurredView";

export default function TabsLayout() {
  const { theme } = useThemeContext();
  const { isSmallScreen } = useScreen();
  const styles = createStyle(theme, isSmallScreen);

  const getView = (children) => {
    if (isSmallScreen) {
      return (
        <BlurredView style={styles.blurredContainer}>{children}</BlurredView>
      );
    } else {
      return <View style={styles.blurredContainer}>{children}</View>;
    }
  };

  return getView(
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
    </Tabs>,
  );
}

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    blurredContainer: {
      flex: 1,
      position: "relative",
      borderRadius: isSmallScreen ? 0 : 15,
      overflow: "hidden",
    },
  });
}
