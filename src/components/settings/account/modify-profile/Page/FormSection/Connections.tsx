import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import SectionHeader from "@/src/components/SectionHeader";
import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";

interface ConnectionCardProps {
  platform: string;
  icon: string;
  title: string;
  subtitle: string;
  connected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

function ConnectionCard({
  platform,
  icon,
  title,
  subtitle,
  connected,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  return (
    <View style={styles.connectionCard}>
      <View style={styles.connectionInfo}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: connected
                ? "rgba(29, 161, 242, 0.2)"
                : "rgba(255,255,255,0.1)",
            },
          ]}
        >
          <Icon name={icon} size={20} color={connected ? "#1DA1F2" : "#888"} />
        </View>
        <View>
          <Text style={styles.connTitle}>{title}</Text>
          <Text style={styles.connSub}>{subtitle}</Text>
        </View>
      </View>
      <HoverAndPressedButton
        style={connected ? styles.disconnectBtn : styles.connectBtn}
        onPress={connected ? onDisconnect : onConnect}
      >
        <Text style={connected ? styles.disconnectText : styles.connectText}>
          {connected ? "Unlink" : "Link"}
        </Text>
      </HoverAndPressedButton>
    </View>
  );
}

export default function Connections() {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <>
      <SectionHeader icon="Link02Icon" title="Connections" />
      <View style={styles.overlayWrapper}>
        <View style={styles.row}>
          <ConnectionCard
            platform="twitter"
            icon="NewTwitterIcon"
            title="Twitter"
            subtitle="@novyse_official"
            connected={true}
            onDisconnect={() => {}}
          />

          <ConnectionCard
            platform="github"
            icon="Github01Icon"
            title="GitHub"
            subtitle="Share repo"
            connected={false}
            onConnect={() => {}}
          />
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
      flexDirection: "column",
      pointerEvents: "none",
      gap: 12,
    },

    connectionCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.03)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.05)",
      padding: 16,
      borderRadius: 20,
      marginBottom: 12,
    },

    connectionInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    connTitle: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
    },
    connSub: {
      color: "#888",
      fontSize: 12,
    },
    disconnectBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(248, 113, 113, 0.2)",
      backgroundColor: "rgba(248, 113, 113, 0.1)",
    },
    disconnectText: {
      color: "#f87171",
      fontSize: 12,
      fontWeight: "600",
    },
    connectBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: "#334155",
    },
    connectText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
    },
  });
