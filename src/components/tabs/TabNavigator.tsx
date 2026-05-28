import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { createBottomTabNavigator } from "expo-router/js-tabs";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "expo-router/react-navigation";

import { tabNavigationRef } from "@/src/utils/navigation/tabRef";
import { useThemeContext, Theme } from "@/src/context/ThemeContext";
import { useScreen } from "@/src/context/ScreenContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useWindowSizeStore, {
  SIDEBAR_MIN,
} from "@/src/context/WindowSizeContext";

import TabBar from "@/src/components/tabs/TabBar";
import Icon from "@/src/components/Icon";

import ChatList from "@/src/components/tabs/pages/ChatList";
import Settings from "@/src/components/tabs/pages/Settings";
import ProfilePage from "@/src/components/tabs/pages/Profile";
import Search from "@/src/components/tabs/pages/Search";

const Tab = createBottomTabNavigator();

let globalNavState: any = undefined;
export const resetGlobalNavState = () => {
  globalNavState = undefined;
};

export const getActiveTabName = () =>
  globalNavState?.routes[globalNavState.index]?.name as string | undefined;

export default function TabNavigator({
  isDetailOpen,
}: {
  isDetailOpen?: boolean;
}) {
  const { theme } = useThemeContext();
  const { isSmallScreen } = useScreen();
  const { width } = useWindowDimensions();
  const styles = createStyle(theme, isSmallScreen);

  return (
    <View style={styles.blurredContainer}>
      <NavigationIndependentTree>
        <NavigationContainer
          ref={tabNavigationRef}
          initialState={globalNavState}
          onStateChange={(state) => {
            globalNavState = state;
            if (state?.routes[state.index]?.name === "ChatList") return;
            const s = useWindowSizeStore.getState();
            if (s.isSidebarCollapsed) s.setSidebarCollapsed(false);
            s.setDetailWidth((dw) => Math.min(dw, width - SIDEBAR_MIN));
          }}
          documentTitle={{
            formatter: (options, route) => `Novyse - App`,
          }}
        >
          <Tab.Navigator
            tabBar={(props) => <TabBar {...props} />}
            backBehavior={isDetailOpen ? "none" : "firstRoute"}
            screenOptions={{
              sceneStyle: { backgroundColor: "transparent" },
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
      backgroundColor: "transparent",
    },
  });
}
