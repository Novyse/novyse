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
import useWindowSizeStore, {
  SIDEBAR_MIN,
} from "@/src/context/WindowSizeContext";

import TabBar from "@/src/components/features/tabs/TabBar";
import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "@/src/components/layout/BlurredView";
import ChatList from "@/src/components/pages/tabs/ChatList";
import Settings from "@/src/components/pages/tabs/Settings";
import ProfilePage from "@/src/components/pages/tabs/Profile";
import Search from "@/src/components/pages/tabs/Search";

const Tab = createBottomTabNavigator();

let globalNavState: any = undefined;
export const resetGlobalNavState = () => {
  globalNavState = undefined;
};

export const getActiveTabName = () =>
  globalNavState?.routes[globalNavState.index]?.name as string | undefined;

export default function TabNavigator() {
  const { theme } = useThemeContext();
  const { isSmallScreen } = useScreen();
  const { width } = useWindowDimensions();
  const styles = createStyle(theme, isSmallScreen);
  const Container = isSmallScreen ? View : BlurredView;

  return (
    <Container style={styles.blurredContainer}>
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
            backBehavior="none"
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
    </Container>
  );
}

function createStyle(theme: Theme, isSmallScreen: boolean) {
  return StyleSheet.create({
    blurredContainer: {
      flex: 1,
      position: "relative",
      borderRadius: isSmallScreen ? 0 : 25,
      overflow: "hidden",
      // backgroundColor: "transparent",
    },
  });
}
