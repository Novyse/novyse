import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";

const Avatar = ({
  uuid,
  uri,
  size = 32,
  isOnline = false,
  theme,
  onEdit = undefined,
}) => {
  const styles = createStyles(size, theme);
  const { uri: resolvedUri } = useProfilePicture(uuid, uri);

  const [isHovered, setIsHovered] = useState(false);

  const AvatarImage = () => (
    <View style={{ width: size, height: size }}>
      <Image
        key={uuid || uri}
        source={{ uri: resolvedUri }}
        style={styles.avatar}
      />
      {isOnline && <View style={styles.onlineIndicator} />}
    </View>
  );

  return onEdit ? (
    <HoverAndPressedButton
      onPress={onEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AvatarImage />
      {isHovered && (
        <View style={styles.editIconContainer}>
          <Icon name="PencilEdit02Icon" size={24} color={theme.text} />
        </View>
      )}
    </HoverAndPressedButton>
  ) : (
    <AvatarImage />
  );
};

const createStyles = (size, theme) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: 16,
      backgroundColor: "#00000000",
    },
    editIconContainer: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
    onlineIndicator: {
      position: "absolute",
      bottom: 16,
      right: 16,
      width: size / 10,
      height: size / 10,
      backgroundColor: "#4CAF50",
      borderRadius: 999,
    },
  });

export default Avatar;
