import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";

const INDICATOR_RATIO = 0.25;

interface AvatarProps {
  uuid?: string;
  uri?: string;
  size?: number;
  isOnline?: boolean;
  theme: any;
  onEdit?: () => void;
}

const Avatar = ({
  uuid,
  uri,
  size = 32,
  isOnline = false,
  theme,
  onEdit,
}: AvatarProps) => {
  const styles = createStyles(size, theme);
  const { uri: resolvedUri } = useProfilePicture(uuid, uri);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const indicatorSize = Math.max(Math.round(size * INDICATOR_RATIO), 8);
  const offset = Math.round(indicatorSize * 0);

  const AvatarImage = () => (
    <View style={{ width: size, height: size }}>
      <Image
        key={uuid || uri}
        source={{ uri: resolvedUri }}
        style={styles.avatar}
      />
      {isOnline && (
        <View
          style={[
            styles.indicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              bottom: -offset,
              right: -offset,
            },
          ]}
        />
      )}
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

const createStyles = (size: number, theme: any) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: 999,
      backgroundColor: "#00000000",
    },
    editIconContainer: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
    indicator: {
      position: "absolute",
      backgroundColor: "#3DBA6F",
    },
  });

export default Avatar;
