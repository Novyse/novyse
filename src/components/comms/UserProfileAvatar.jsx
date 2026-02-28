import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useThemeContext } from "@/context/ThemeContext";

import Avatar from "@/src/components/Avatar";

const UserProfileAvatar = ({
  userHandle,
  deviceUUID,
  profilePictureUUID,
  containerWidth,
  containerHeight,
}) => {
  const { theme } = useThemeContext();

  // Memoizza i colori del gradiente per evitare rigenerazioni continue
  const gradientColors = useMemo(() => {
    // Genera colori deterministici basati su deviceUUID
    let hash = 0;
    if (deviceUUID) {
      for (let i = 0; i < deviceUUID.length; i++) {
        const char = deviceUUID.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
    }

    const gradientPalettes = [
      ["#667eea", "#764ba2"], // Purple blue
      ["#f093fb", "#f5576c"], // Pink red
      ["#4facfe", "#00f2fe"], // Blue cyan
      ["#43e97b", "#38f9d7"], // Green cyan
      ["#fa709a", "#fee140"], // Pink yellow
      ["#a8edea", "#fed6e3"], // Cyan pink light
      ["#ffecd2", "#fcb69f"], // Orange peach
      ["#ff9a9e", "#fecfef"], // Pink purple light
      ["#d299c2", "#fef9d7"], // Purple yellow
      ["#89f7fe", "#66a6ff"], // Light blue
    ];

    const index = Math.abs(hash) % gradientPalettes.length;
    return gradientPalettes[index];
  }, [deviceUUID]);

  // Calcola le dimensioni dell'avatar (circa 35% della dimensione del container)
  const avatarSize = Math.max(
    Math.min(containerWidth, containerHeight) * 0.35,
    20,
  );

  return (
    <View
      style={[
        styles.container,
        { width: containerWidth, height: containerHeight },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          <View
            style={[
              styles.avatarContainer,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
          >
            <Avatar uuid={profilePictureUUID} size={avatarSize} theme={theme} />
          </View>
          <View style={styles.nameContainer}>
            <Text
              style={styles.userName}
              numberOfLines={1}
              ellipsizeMode="tail"
              selectable={false}
            >
              {userHandle || "Unknown User"}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 10,
  },
  gradient: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  nameContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "70%",
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "left",
  },
});

export default UserProfileAvatar;
