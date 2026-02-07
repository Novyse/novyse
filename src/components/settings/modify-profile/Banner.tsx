import React, { useContext } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemeContext } from "@/context/ThemeContext";

import Icon from "@/src/components/Icon";

interface BannerProps {
  bannerUri?: string;
  onEditBanner?: () => void;
}

export default function Banner({ bannerUri, onEditBanner }: BannerProps) {
  const { theme } = useContext(ThemeContext);

  const styles = createStyles(theme);

  return (
    <View style={styles.bannerContainer}>
      <Image
        source={{
          uri: bannerUri || "https://www.novyse.com/images/banner/default.jpg",
        }}
        style={styles.bannerImage}
      />
      <LinearGradient
        colors={["transparent", theme.backgroundCard]}
        style={styles.bannerOverlay}
      />
      <Icon
        name="CircleLock01Icon"
        size={16}
        color="white"
        hoverColor="white"
        onPress={() => {}}
        style={styles.editIcon}
      />
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    bannerContainer: {
      height: 180,
      width: "100%",
      position: "relative",
    },
    bannerImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    bannerOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
    },
    editIcon: {
      position: "absolute",
      top: 12,
      right: 12,
      borderRadius: 999,
    },
  });
