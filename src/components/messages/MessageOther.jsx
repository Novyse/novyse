import React, { useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";

import useOpenFile from "@/src/hooks/file/useOpenFile";
import FileSizeProgress from "./FileSizeProgress";

import FileButton from "./Button";

const MessageOther = ({ fileRef, uuid, mimeType, size, name, isPending }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { openFile } = useOpenFile();

  const handlePress = () => {
    openFile({ fileRef, uuid, mimeType, name });
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <FileButton
        uuid={uuid}
        isPending={isPending}
        isAvailable={!!fileRef}
        isReady={!!fileRef}
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
