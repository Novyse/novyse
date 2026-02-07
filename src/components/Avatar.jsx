import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";

const Avatar = ({ uuid, uri, size = 32, theme, onEdit = null }) => {
  const styles = createStyles(size, theme);
  const { uri: resolvedUri } = useProfilePicture(uuid, uri);

  const [isHovered, setIsHovered] = useState(false);

  const AvatarImage = () => (
    <Image
      key={uuid || uri}
      source={{ uri: resolvedUri }}
      style={styles.avatar}
    />
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
  });

export default Avatar;
