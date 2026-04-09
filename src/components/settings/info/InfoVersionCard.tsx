import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { APP_VERSION, BUILD_NUMBER, BUILD_DATE } from "@/app.config";
import SettingsCard from "@/src/components/settings/SettingsCard";

const InfoVersionCard = ({ theme }: { theme: any }) => {
  // Format Date for cleaner display (just YYYY/MM/DD)
  const formattedDate = BUILD_DATE.split(" ")[0];

  return (
    <SettingsCard style={styles.card}>
      <View style={styles.container}>
        <View style={styles.tile}>
          <AppText
            style={[styles.label, { color: theme.text }]}
            translationKey="settings.info.version"
          />
          <AppText
            style={[styles.value, { color: theme.text }]}
            text={APP_VERSION}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.tile}>
          <AppText
            style={[styles.label, { color: theme.text }]}
            translationKey="settings.info.build"
          />
          <AppText
            style={[styles.value, { color: theme.text }]}
            text={String(BUILD_NUMBER)}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.tile}>
          <AppText
            style={[styles.label, { color: theme.text }]}
            translationKey="settings.info.released"
          />
          <AppText
            style={[styles.value, { color: theme.text }]}
            text={formattedDate}
          />
        </View>
      </View>
    </SettingsCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0, // Reset default padding for custom internal layout
    overflow: "hidden",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
    opacity: 0.6,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  divider: {
    width: 1,
    height: "60%",
    opacity: 0.1,
  },
});

export default InfoVersionCard;
