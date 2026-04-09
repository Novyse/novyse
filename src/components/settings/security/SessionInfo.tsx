import React from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/AppText";

interface SessionInfoProps {
  ip: string;
  createdAt: string;
  lastActive: string;
}

const SessionInfo = ({ ip, createdAt, lastActive }: SessionInfoProps) => {
  return (
    <View style={styles.container}>
      <AppText style={styles.row}>
        <AppText
          style={styles.label}
          translationKey="settings.security.sessions.ip"
        />
        : {ip}
      </AppText>
      <AppText style={styles.row}>
        <AppText
          style={styles.label}
          translationKey="settings.security.sessions.created"
        />
        : {createdAt}
      </AppText>
      <AppText style={styles.row}>
        <AppText
          style={styles.label}
          translationKey="settings.security.sessions.lastActivity"
        />
        : {lastActive}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    gap: 2,
  },
  row: {
    fontSize: 13,
    color: "#a0a0a0",
  },
  label: {
    fontWeight: "600",
    color: "#c0c0c0",
  },
});

export default SessionInfo;
