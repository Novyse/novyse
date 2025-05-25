import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Text, Image, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getFirstLetter } from "../utils/colorUtils";

const UserProfileAvatar = ({
  userHandle,
  profileImageUri = null,
  containerWidth,
  containerHeight,
}) => {
  const [showFallback, setShowFallback] = useState(!profileImageUri);

  // Memoizza i colori del gradiente per evitare rigenerazioni continue
  const gradientColors = useMemo(() => {
    // Genera colori deterministici basati su userHandle
    let hash = 0;
    if (userHandle) {
      for (let i = 0; i < userHandle.length; i++) {
        const char = userHandle.charCodeAt(i);
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
  }, [userHandle]);

  // Estrai colori dall'immagine del profilo solo se necessario
  useEffect(() => {
    setShowFallback(!profileImageUri);
  }, [profileImageUri]);

  // Calcola le dimensioni dell'avatar (circa 35% della dimensione del container)
  const avatarSize = Math.max(Math.min(containerWidth, containerHeight) * 0.35, 20); // Minimo 20px per evitare dimensioni zero
  const fontSize = Math.max(avatarSize * 0.4, 10); // Minimo 10px per evitare dimensione zero del font

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
            {showFallback ? (
              <Text style={[styles.fallbackText, { fontSize }]}>
                {getFirstLetter(userHandle)}
              </Text>
            ) : (
              <Image
                source={{ uri: profileImageUri }}
                style={[
                  styles.profileImage,
                  {
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                  },
                ]}
                resizeMode="cover"
                onError={() => setShowFallback(true)}
              />
            )}
          </View>
          <View style={styles.nameContainer}>
            <Text
              style={styles.userName}
              numberOfLines={1}
              ellipsizeMode="tail"
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  profileImage: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  fallbackText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
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
