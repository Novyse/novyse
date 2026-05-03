import React, { useContext } from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import AppText from "@/src/components/AppText";
import { ThemeContext } from "@/context/ThemeContext";

import useUriResolver from "@/src/hooks/file/useUriResolver";
import FileSizeProgress from "./FileSizeProgress";

import FileButton from "./Button";

const MessageOther = ({ fileRef, uuid, mimeType, size, name, isPending }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { uri: fileUri } = useUriResolver(fileRef);

  const handlePress = () => {
    if (fileUri) {
      Linking.openURL(fileUri).catch((err) =>
        console.error("Failed to open file:", err),
      );
    }
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <FileButton
        uuid={uuid}
        isPending={isPending}
        isAvailable={!!fileRef}
        isReady={!!fileUri}
        type={"OTHER"}
        handleDefaultPress={handlePress}
      />
      <View style={styles.detailsContainer}>
        <AppText style={styles.name} numberOfLines={1} text={name} />
        <FileSizeProgress uuid={uuid} size={size} style={styles.fileSize} />
      </View>
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingTop: 10,
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
