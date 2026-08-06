import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import {
  HEADER_ROW_HEIGHT,
  ICON_BUTTON_SIZE,
} from "@/src/components/features/header/constants";

interface AppHeaderRowProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
}

const AppHeaderRow = ({ left, center, right, style }: AppHeaderRowProps) => (
  <View style={[styles.row, style]}>
    <View style={styles.left}>{left}</View>
    <View style={styles.center}>{center}</View>
    <View style={styles.right}>{right}</View>
  </View>
);

export const headerIconButtonStyle = StyleSheet.create({
  iconButton: {
    width: ICON_BUTTON_SIZE,
    height: ICON_BUTTON_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: HEADER_ROW_HEIGHT,
    width: "100%",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  center: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
});

export default AppHeaderRow;
