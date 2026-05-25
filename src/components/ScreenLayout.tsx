import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenLayoutProps {
  children: React.ReactNode;
  style?: object;
  fullscreen?: boolean;
}

/**
 * @param children - Contenuto della schermata
 * @param style - Stili aggiuntivi per il contenitore
 */
const ScreenLayout = ({
  children,
  style = {},
  fullscreen = false,
}: ScreenLayoutProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          paddingTop: fullscreen ? null : insets.top,
          paddingBottom: fullscreen ? null : insets.bottom,
          backgroundColor: "transparent",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default ScreenLayout;
