import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface SessionInfoProps {
  ip: string;
  createdAt: string;
  lastActive: string;
}

const SessionInfo = ({ ip, createdAt, lastActive }: SessionInfoProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.row}>
        <Text style={styles.label}>IP: </Text>
        {ip}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>Created: </Text>
        {createdAt}
      </Text>
      <Text style={styles.row}>
        <Text style={styles.label}>Last activity: </Text>
        {lastActive}
      </Text>
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
