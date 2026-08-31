import { useContext } from "react";
import { View, StyleSheet, TouchableOpacity, Linking } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { LinearGradient } from "expo-linear-gradient";

import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

interface Connection {
  name: string;
  icon: string;
  url?: string;
}

interface ProfileConnectionsProps {
  connections?: Connection[];
  onConnectionPress?: (connection: Connection) => void;
}

export default function ProfileConnections({
  connections,
  onConnectionPress,
}: ProfileConnectionsProps) {
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
        console.log("Error opening URL:", err),
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
          <Typography
            translationKey="profile.connections.title"
          />
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
                    <Icon name={connection.icon} size={18} />
                  </View>
                  <Typography
                    text={connection.name}
                  />
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
      paddingVertical: 15,
    },
    glassCard: {
      borderRadius: 15,
      overflow: "hidden",
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 15,
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
  });
