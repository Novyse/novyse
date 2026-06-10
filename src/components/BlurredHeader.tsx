import React from "react";
import { StyleSheet, View } from "react-native";

import HeaderBase from "./HeaderBase";
import BlurredView from "./BlurredView";
import StatusHeader from "./chat/list/header/StatusHeader";

interface BlurredHeaderProps {
  children: React.ReactNode;
  style?: object;
  intensity?: number;
  commsHeader?: React.ReactNode;
}

const BlurredHeader = ({
  children,
  style,
  intensity,
  commsHeader,
}: BlurredHeaderProps) => {
  const styles = createStyles();
  return (
    <HeaderBase>
      <BlurredView style={[styles.container, style]} intensity={intensity}>
        {children}
      </BlurredView>
      {commsHeader && <View style={{ width: "100%" }}>{commsHeader}</View>}
      <StatusHeader />
    </HeaderBase>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 4,
      height: 60,
    },
  });

export default BlurredHeader;
