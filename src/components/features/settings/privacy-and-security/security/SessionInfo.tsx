import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";

interface SessionInfoProps {
  ip: string;
  createdAt: string;
  lastActive: string;
}

const SessionInfo = ({ ip, createdAt, lastActive }: SessionInfoProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <AppText style={styles.row}>
        <AppText
          style={styles.label}
          translationKey="settings.privacyAndSecurity.sessions.ip"
        />
        : {ip}
      </AppText>
      <AppText style={styles.row}>
        <AppText
          style={styles.label}
          translationKey="settings.privacyAndSecurity.sessions.created"
        />
        : {createdAt}
      </AppText>
      <AppText style={styles.row}>
        <AppText
          style={styles.label}
          translationKey="settings.privacyAndSecurity.sessions.lastActivity"
        />
        : {lastActive}
      </AppText>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginTop: 4,
      gap: 2,
    },
    row: {
      fontSize: 13,
      color: theme.subtitle,
    },
    label: {
      fontWeight: "600",
      color: theme.text,
    },
  });

export default SessionInfo;
