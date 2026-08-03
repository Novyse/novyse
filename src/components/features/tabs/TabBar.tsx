import React, { useState, useContext } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import { BottomTabBarProps } from "expo-router/js-tabs";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useDerivedValue,
  useAnimatedReaction,
} from "react-native-reanimated";
import BlurredView from "@/src/components/BlurredView";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useScreen } from "@/src/context/ScreenContext";
import useWindowSizeStore, {
  SIDEBAR_MIN,
} from "@/src/context/WindowSizeContext";
import Icon from "@/src/components/ui/icon/Icon";

const TabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useContext(ThemeContext);
  const { isSmallScreen } = useScreen();
  const { isSidebarCollapsed } = useWindowSizeStore();
  const showCollapsedSidebar =
    isSidebarCollapsed &&
    !isSmallScreen &&
    state.routes[state.index].name === "ChatList";
  const styles = createStyle(theme);

  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return !!options.tabBarIcon;
  });

  const numTabs = visibleRoutes.length;
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const translateX = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  const tabWidth = useDerivedValue(() =>
    containerWidth.value > 0 ? (containerWidth.value - 10) / numTabs : 0,
  );

  const activeRoute = state.routes[state.index];
  const visibleIndex = visibleRoutes.findIndex(
    (r) => r.key === activeRoute.key,
  );

  const lastValidIndex = useSharedValue(0);

  const activeVisibleIndex = useDerivedValue(() => {
    if (visibleIndex !== -1) {
      lastValidIndex.value = visibleIndex;
    }
    return lastValidIndex.value;
  }, [visibleIndex]);

  useAnimatedReaction(
    () => activeVisibleIndex.value * tabWidth.value,
    (target) => {
      translateX.value = withSpring(target, { damping: 70, stiffness: 1200 });
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: tabWidth.value,
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    containerWidth.value = event.nativeEvent.layout.width;
    if (!isLayoutReady) setIsLayoutReady(true);
  };

  const renderTabBarContent = () => (
    <BlurredView
      intensity={60}
      style={styles.blurredContainer}
      onLayout={onLayout}
    >
      {numTabs > 0 && isLayoutReady && (
        <Animated.View style={[styles.indicator, animatedStyle]} />
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        if (!options.tabBarIcon) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            {options.tabBarIcon({
              focused: isFocused,
              color: isFocused ? theme.icon : theme.subtitle,
              size: 24,
            })}
          </TouchableOpacity>
        );
      })}
    </BlurredView>
  );

  const { width } = useWindowDimensions();
  const { setSidebarCollapsed, setDetailWidth } = useWindowSizeStore();

  const handleExpand = () => {
    setSidebarCollapsed(false);
    setDetailWidth(width - SIDEBAR_MIN);
  };

  if (showCollapsedSidebar) {
    return (
      <View style={styles.collapsedContainer}>
        <BlurredView style={styles.blurredToggle}>
          <Icon name="ArrowRight01Icon" onPress={handleExpand} />
        </BlurredView>
      </View>
    );
  }

  return <View style={styles.container}>{renderTabBarContent()}</View>;
};

export default TabBar;

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 25,
      alignSelf: "center",
      borderRadius: 30,
      height: 60,
      minWidth: 200,
      maxWidth: 230,
    },
    collapsedContainer: {
      position: "absolute",
      bottom: 25,
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 100,
    },
    blurredToggle: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 25,
    },
    blurredContainer: {
      flex: 1,
      borderRadius: 30,
      width: "100%",
      height: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      alignSelf: "center",
      padding: 5,
      borderWidth: 1,
    },
    tabButton: {
      flex: 1,
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    indicator: {
      position: "absolute",
      left: 5,
      height: 50,
      backgroundColor: theme.primary,
      borderRadius: 25,
      opacity: 0.25,
      zIndex: 0,
    },
  });
