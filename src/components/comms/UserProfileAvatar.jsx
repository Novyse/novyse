import React, { useEffect, useState, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getColors } from "react-native-image-colors";

import { ThemeContext } from "@/context/ThemeContext";
import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";

import Avatar from "@/src/components/Avatar";
import AppText from "../AppText";

const UserProfileAvatar = ({
  userHandle,
  deviceUUID,
  profilePictureUUID,
  containerWidth,
  containerHeight,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  const { uri } = useProfilePicture(profilePictureUUID);

  const fallbackColors = [theme.primary, theme.secondary];
  const [gradientColors, setGradientColors] = useState(fallbackColors);

  useEffect(() => {
    let isMounted = true;
    const getGradientColors = async () => {
      if (uri) {
        try {
          const extractedColors = await getColors(uri, { cache: true });
          const nextGradient = [
            extractedColors?.dominant,
            extractedColors?.vibrant,
          ];

          if (isMounted) {
            setGradientColors(nextGradient);
          }
        } catch (error) {
          console.warn("Error extracting colors from image:", error);
          if (isMounted) {
            setGradientColors(fallbackColors);
          }
        }
      } else {
        if (isMounted) {
          setGradientColors(fallbackColors);
        }
      }
    };

    getGradientColors();

    return () => {
      isMounted = false;
    };
  }, [uri]);

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
            <AppText
              style={styles.userName}
              numberOfLines={1}
              ellipsizeMode="tail"
              text={userHandle || "Unknown User"}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
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
    backgroundColor: theme.backgroundModalOverlay,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "70%",
  },
  userName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "left",
  },
});

export default UserProfileAvatar;
