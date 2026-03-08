import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";

import { tabNavigationRef } from "@/src/utils/navigation/tabRef";
import { useThemeContext, Theme } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";

import TabBar from "@/src/components/tabs/TabBar";
import Icon from "@/src/components/Icon";

import ChatList from "@/src/components/tabs/pages/ChatList";
import Settings from "@/src/components/tabs/pages/Settings";
import ProfilePage from "@/src/components/tabs/pages/Profile";
import Search from "@/src/components/tabs/pages/Search";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { theme } = useThemeContext();
  const { isSmallScreen } = useScreen();
  const styles = createStyle(theme, isSmallScreen);

  return (
    <View style={styles.blurredContainer}>
      <NavigationIndependentTree>
        <NavigationContainer
          ref={tabNavigationRef}
          documentTitle={{
            formatter: (options, route) => `Novyse - App`,
          }}
        >
          <Tab.Navigator
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{
              sceneStyle: { backgroundColor: theme.backgroundMainGradient[0] },
              animation: "shift",
            }}
          >
            <Tab.Screen
              name="ChatList"
              initialParams={{ screen: "ChatList" }}
              component={ChatList}
              options={{
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                  <Icon name="ChatIcon" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Settings"
              component={Settings}
              options={{
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                  <Icon name="SettingsIcon" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfilePage}
              options={{
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                  <Icon name="UserIcon" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Search"
              component={Search}
              options={{ headerShown: false, tabBarButton: () => null }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    </View>
  );
}

function createStyle(theme: Theme, isSmallScreen: boolean) {
  return StyleSheet.create({
    blurredContainer: {
      flex: 1,
      position: "relative",
      borderRadius: isSmallScreen ? 0 : 15,
      overflow: "hidden",
      backgroundColor: theme.backgroundMainGradient[0],
    },
  });
}
