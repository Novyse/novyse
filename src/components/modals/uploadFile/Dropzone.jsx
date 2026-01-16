import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import Icon from "@/src/components/Icon";

import { formatFileSize } from "@/src/utils/storage/file/utils";

const Dropzone = ({
  title,
  subtitle,
  files,
  setFiles,
  onChooseFile,
  maxSingleSize = 52428800,
  maxTotalSize = 2147483648,
  maxFile = 50,
  typeFile = "ALL",
  theme,
}) => {
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <View style={styles.uploadIconCircle}>
        <Icon name="CloudUploadIcon" size={24} color={theme.text} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>
        {subtitle} Max single size: {formatFileSize(maxSingleSize)} Max total
        size: {formatFileSize(maxTotalSize)} File Number: {maxFile}
      </Text>
      <TouchableOpacity
        style={styles.chooseFileBtn}
        onPress={onChooseFile}
        disabled={!onChooseFile}
      >
        <Text style={styles.chooseFileText}>Choose File</Text>
      </TouchableOpacity>
      {files && files.length > 0 && (
        <View style={styles.fileList}>
          {files.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <Icon name="FileIcon" size={16} color={theme.text} />
              <Text style={styles.fileName}>{file.name}</Text>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => setFiles(files.filter((_, i) => i !== index))}
              >
                <Icon name="Cancel01Icon" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      borderWidth: 1,
      borderColor: theme.primary,
      borderStyle: "dashed",
      borderRadius: 20,
      padding: 30,
      alignItems: "center",
      marginBottom: 24,
    },
    title: {
      color: theme.text,
      fontWeight: "600",
      marginTop: 12,
      userSelect: "none",
    },
    note: {
      color: theme.placeholderText,
      fontSize: 12,
      marginTop: 4,
      marginBottom: 15,
      userSelect: "none",
    },
    chooseFileBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    chooseFileText: {
      color: theme.text,
      fontSize: 13,
      userSelect: "none",
    },
    fileList: {
      marginTop: 15,
      width: "100%",
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      justifyContent: "space-between",
    },
    fileName: {
      color: theme.text,
      fontSize: 12,
      marginLeft: 8,
      flex: 1,
    },
    removeBtn: {
      marginLeft: 8,
    },
  });

export default Dropzone;
