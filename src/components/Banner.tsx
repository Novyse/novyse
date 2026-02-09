import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "./HoverAndPressedButton";

interface BannerProps {
  uuid?: string;
  uri?: string;
  size?: number;
  theme: any;
  onEdit?: () => void;
}

export default function Banner({
  uuid,
  uri,
  size = 180,
  theme,
  onEdit = undefined,
}: BannerProps) {
  const styles = createStyles(theme, size);

  const [isHovered, setIsHovered] = useState(false);

  const BannerImage = () => (
    <Image
      source={{
        uri: uri || "https://www.novyse.com/images/banner/default.jpg",
      }}
      style={styles.bannerImage}
    />
  );

  return onEdit ? (
    <HoverAndPressedButton
      onPress={onEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={styles.hoverButtonContainer}
    >
      <BannerImage />
      {isHovered && (
        <View style={styles.editIconContainer}>
          <Icon name="UnavailableIcon" size={24} color={theme.text} />
        </View>
      )}
    </HoverAndPressedButton>
  ) : (
    <BannerImage />
  );
}

const createStyles = (theme: any, size: number) =>
  StyleSheet.create({
    bannerImage: {
      width: "100%",
      height: size,
      resizeMode: "cover",
      backgroundColor: "#00000000",
    },
    hoverButtonContainer: { padding: 0, borderRadius: 0 },

    editIconContainer: {
      position: "absolute",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
  });
