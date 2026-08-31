import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";

interface ProfileBannerProps {
  uuid?: string;
  uri?: string;
  height?: number;
  onEdit?: () => void;
}

const ProfileBanner = React.memo(
  ({ uuid, uri, height = 190, onEdit = undefined }: ProfileBannerProps) => {
    const styles = createStyles(height);

    const [isHovered, setIsHovered] = useState(false);

    const renderProfileBannerImage = () => (
      <Image
        source={{
          uri: uri || "https://www.novyse.com/images/banner/default.jpg",
        }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
    );

    return onEdit ? (
      <HoverAndPressedButton
        onPress={onEdit}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={styles.hoverButtonContainer}
      >
        {renderProfileBannerImage()}
        {isHovered && (
          <View style={styles.editIconContainer}>
            <Icon name="UnavailableIcon" />
          </View>
        )}
      </HoverAndPressedButton>
    ) : (
      renderProfileBannerImage()
    );
  },
);

export default ProfileBanner;

const createStyles = (height: number) =>
  StyleSheet.create({
    bannerImage: {
      width: "100%",
      height: height,
    },
    hoverButtonContainer: { padding: 0, borderRadius: 0 },

    editIconContainer: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
  });
