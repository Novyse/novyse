import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import Icon from "@/src/components/Icon";

import Label from "@/src/components/Label";
import SectionHeader from "@/src/components/SectionHeader";
import ColorDot from "@/src/components/ColorDot";

export default function Appareance() {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <>
      <SectionHeader icon="Pen01Icon" translationKey="settings.modifyProfile.appearance" />
      <View style={styles.overlayWrapper}>
        <View style={styles.row}>
          <Label translationKey="settings.modifyProfile.profileColor" />
          <View style={styles.colorRow}>
            <ColorDot color="#3b82f6" selected />
            <ColorDot color="#a855f7" />
            <ColorDot color="#10b981" />
            <ColorDot color="#f43f5e" />
          </View>
          <Label translationKey="settings.modifyProfile.backgroundColor" />
          <View style={styles.colorRow}>
            <ColorDot color="#3b82f6" />
            <ColorDot color="#a855f7" />
            <ColorDot color="#10b981" selected />
            <ColorDot color="#f43f5e" />
          </View>
        </View>
        <View style={styles.infoContainer}>
          <Icon name="UnavailableIcon"  color="white" />
        </View>
      </View>
    </>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlayWrapper: {
      position: "relative",
    },
    infoContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      borderRadius: 8,
    },
    row: {
      flexDirection: "row",
      pointerEvents: "none",
      gap: 16,
      marginBottom: 20,
    },
    colorRow: {
      flexDirection: "row",
      gap: 12,
      justifyContent: "center",
    },
  });
