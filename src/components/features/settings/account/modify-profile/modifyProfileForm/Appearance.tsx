import { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";

import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "@/src/components/BlurredView";

import Label from "@/src/components/ui/label/Label";
import SectionHeader from "@/src/components/features/settings/account/modify-profile/modifyProfileForm/SectionHeader";
import ColorDot from "@/src/components/ColorDot";

export default function Appareance() {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <>
      <SectionHeader
        icon="Pen01Icon"
        translationKey="settings.modifyProfile.appearance"
      />
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
        <BlurredView style={styles.infoContainer}>
          <Icon name="UnavailableIcon" />
        </BlurredView>
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
      backgroundColor: theme.backgroundModalOverlay,
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
