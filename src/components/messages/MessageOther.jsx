import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import useUriResolver from "@/src/hooks/file/useUriResolver";
import { formatFileSize } from "@/src/utils/storage/file/utils";

import FileButton from "./Button";

const MessageOther = ({ fileRef, uuid, mimeType, size, name }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { uri: fileUri } = useUriResolver(fileRef);

  const handlePress = () => {
    if (fileUri) {
      Linking.openURL(fileUri).catch((err) =>
        console.error("Failed to open file:", err)
      );
    }
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <FileButton
        uuid={uuid}
        isAvailable={!!fileRef}
        isReady={!!fileUri}
        type={"OTHER"}
        handleDefaultPress={handlePress}
      />
      <View style={styles.detailsContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.fileSize}>{formatFileSize(size)}</Text>
      </View>
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      borderRadius: 8,
      marginVertical: 4,
    },
    detailsContainer: {
      flex: 1,
    },
    name: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    fileSize: {
      fontSize: 12,
      color: theme.text,
    },
  });

export default MessageOther;
