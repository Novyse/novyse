import React, { useState, useContext } from "react";
import { View, Image, StyleSheet, ImageStyle, StyleProp } from "react-native";

import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import { ThemeContext } from "@/src/context/ThemeContext";

import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";

const INDICATOR_RATIO = 0.2;

interface AvatarProps {
  uuid?: string;
  uri?: string;
  size?: number;
  isOnline?: boolean;
  onEdit?: () => void;
  style?: StyleProp<ImageStyle>;
}

const Avatar = ({
  uuid,
  uri,
  size = 32,
  isOnline = false,
  onEdit,
  style,
}: AvatarProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(size, theme);
  const { uri: resolvedUri } = useProfilePicture(uuid, uri);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const indicatorSize = Math.max(Math.round(size * INDICATOR_RATIO), 8);
  const offset = Math.round(indicatorSize * 0);

  const avatarImageContent = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: 999,
        },
        style, // border va qui, sul wrapper esterno
      ]}
    >
      {/* View interna solo per clippare l'immagine */}
      <View
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <Image
          key={uuid || uri}
          source={{ uri: resolvedUri }}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </View>

      {/* Pallino fuori dal clip, ma dentro il wrapper per il posizionamento */}
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
      {avatarImageContent}
      {isHovered && (
        <View style={styles.editIconContainer}>
          <Icon name="PencilEdit02Icon" color={theme.text} />
        </View>
      )}
    </HoverAndPressedButton>
  ) : (
    avatarImageContent
  );
};

const createStyles = (size: number, theme: any) =>
  StyleSheet.create({
    editIconContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 999,
    },
    indicator: {
      position: "absolute",
      backgroundColor: theme.successText,
    },
  });

export default React.memo(Avatar);
