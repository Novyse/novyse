import React, { useContext, useEffect, useState } from "react";
import {
  Platform as RNPlatform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import Platform from "@/src/utils/device/type";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/Icon";

const TOOLBAR_HEIGHT = 24;
const BUTTON_HEIGHT = 24;
const BUTTON_WIDTH = 24;

export const WINDOW_CONTROL_HEIGHT = TOOLBAR_HEIGHT;

type ElectronWindowAPI = {
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onStateChanged: (
    callback: (state: { isMaximized: boolean }) => void,
  ) => () => void;
};

const getElectronWindowAPI = (): ElectronWindowAPI | null => {
  if (typeof window === "undefined") return null;
  const bridge = (window as any).electron;
  if (bridge && bridge.window) return bridge.window as ElectronWindowAPI;
  return null;
};

type WindowButtonProps = {
  onPress: () => void;
  iconName: string;
  iconSize?: number;
  hoverBackground: string;
  pressedBackground: string;
  iconColor: string;
};

const WindowButton: React.FC<WindowButtonProps> = ({
  onPress,
  iconName,
  iconSize = 14,
  hoverBackground,
  pressedBackground,
  iconColor,
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const backgroundColor = pressed
    ? pressedBackground
    : hovered
      ? hoverBackground
      : "transparent";

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.button, { backgroundColor }]}
    >
      <Icon
        name={iconName}
        size={iconSize}
        color={iconColor}
        strokeWidth={1.5}
      />
    </Pressable>
  );
};

const WindowControls: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const [isMaximized, setIsMaximized] = useState(false);

  const api = getElectronWindowAPI();

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    api.isMaximized().then((value) => {
      if (!cancelled) setIsMaximized(value);
    });
    const off = api.onStateChanged((state) => {
      setIsMaximized(state.isMaximized);
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, [api]);

  if (Platform !== "desktop" || RNPlatform.OS !== "web" || !api) {
    return null;
  }

  const iconColor = theme.icon;
  const hoverBg = theme.iconHovered;
  const pressedBg = theme.iconPressed;
  const closeHoverBg = theme.iconDanger;
  const closePressedBg = theme.dangerText;

  return (
    <View style={[styles.toolbar, dragStyle]} pointerEvents="box-none">
      <View style={[styles.buttonsContainer, noDragStyle]}>
        <WindowButton
          onPress={() => api.minimize()}
          iconName="MinusSignIcon"
          iconColor={iconColor}
          hoverBackground={hoverBg}
          pressedBackground={pressedBg}
        />
        <WindowButton
          onPress={() => api.toggleMaximize()}
          iconName={isMaximized ? "Copy01Icon" : "SquareIcon"}
          iconColor={iconColor}
          hoverBackground={hoverBg}
          pressedBackground={pressedBg}
        />
        <WindowButton
          onPress={() => api.close()}
          iconName="Cancel01Icon"
          iconSize={16}
          iconColor={iconColor}
          hoverBackground={closeHoverBg}
          pressedBackground={closePressedBg}
        />
      </View>
    </View>
  );
};

const dragStyle = { WebkitAppRegion: "drag", userSelect: "none" } as any;
const noDragStyle = { WebkitAppRegion: "no-drag" } as any;

const styles = StyleSheet.create({
  toolbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TOOLBAR_HEIGHT,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    backgroundColor: "transparent",
    zIndex: 9999,
  },
  buttonsContainer: {
    flexDirection: "row",
    height: BUTTON_HEIGHT,
  },
  button: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default WindowControls;
