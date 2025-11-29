import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import useFiles from "@/src/hooks/chat/useFiles";

const MessageOther = ({ fileUri, s3Url, uuid, mimeType }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

    const { name, size, state, loading, error } = useFiles(fileUri, s3Url, uuid, MimeType);

  // Funzione per formattare la dimensione del file (es. in KB o MB)
  const formatFileSize = (size) => {
    if (!size) return "";
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Pressable style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📄</Text>
      </View>
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
    iconContainer: {
      marginRight: 8,
    },
    icon: {
      fontSize: 24,
      color: theme.text,
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
