import React, { useContext } from "react";
import { View, StyleSheet, TouchableOpacity, Linking } from "react-native";
import AppText from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";

interface Connection {
  name: string;
  icon: string;
  url?: string;
}

interface ConnectionsProps {
  connections?: Connection[];
  onConnectionPress?: (connection: Connection) => void;
}

export default function Connections({
  connections,
  onConnectionPress,
}: ConnectionsProps) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  // Non renderizzare se non ci sono connessioni
  if (!connections || connections.length === 0) {
    return null;
  }

  const handlePress = (connection: Connection) => {
    if (onConnectionPress) {
      onConnectionPress(connection);
    } else if (connection.url) {
      Linking.openURL(connection.url).catch((err) =>
        console.log("Error opening URL:", err)
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.backgroundMainGradient}
        style={styles.glassCard}
      >
        <View style={styles.content}>
          <AppText style={styles.title} translationKey="profile.connections.title" />
          <View style={styles.connectionsList}>
            {connections.map((connection, index) => (
              <TouchableOpacity
                key={index}
                style={styles.connectionItem}
                onPress={() => handlePress(connection)}
                activeOpacity={0.6}
              >
                <View style={styles.connectionContent}>
                  <View style={styles.iconCircle}>
                    <Icon name={connection.icon} size={18}/>
                  </View>
                  <AppText style={styles.connectionName} text={connection.name} />
                </View>
                <Icon name="ArrowUpRightIcon" size={14} color={theme.text} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    glassCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderColor,
      backgroundColor: theme.backgroundMain,
      overflow: "hidden",
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.text,
      letterSpacing: 1,
      opacity: 0.7,
      marginBottom: 12,
    },
    connectionsList: {
      gap: 8,
    },
    connectionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.backgroundMain,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    connectionContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.backgroundMain,
      justifyContent: "center",
      alignItems: "center",
    },
    connectionName: {
      fontSize: 14,
      color: theme.text,
      fontWeight: "500",
    },
  });
