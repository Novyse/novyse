import React from "react";
import { Image, StyleSheet } from "react-native";

import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";

const Avatar = ({ uuid, uri, size = 32, theme }) => {
  const styles = createStyles(size, theme);
  const { uri: resolvedUri } = useProfilePicture(uuid, uri);

  return (
    <Image
      key={uuid || uri}
      source={{ uri: resolvedUri }}
      style={styles.avatar}
    />
  );
};

const createStyles = (size, theme) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: "#00000000",
    },
  });

export default Avatar;
