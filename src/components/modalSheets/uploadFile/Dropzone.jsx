import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "../../HoverAndPressedButton";

import { formatFileSize } from "@/src/utils/storage/file/utils";
import { getPlatform } from "@/src/utils/device/type";

const Dropzone = ({
  title,
  subtitle,
  files,
  onChooseFile,
  onRemoveFile,
  removeAllFiles,
  invalidFiles,
  maxSingleSize = 52428800,
  maxTotalSize = 2147483648,
  maxFile = 50,
  typeFile = "All",
  theme,
}) => {
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <View style={styles.uploadIconCircle}>
        <Icon name="CloudUploadIcon"  color={theme.text} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>
        {subtitle} Max single size: {formatFileSize(maxSingleSize)} Max total
        size: {formatFileSize(maxTotalSize)} File Number: {maxFile}
      </Text>
      <HoverAndPressedButton
        style={styles.chooseFileBtn}
        onPress={onChooseFile}
        disabled={!onChooseFile}
      >
        <Text style={styles.chooseFileText}>Choose File</Text>
      </HoverAndPressedButton>
      <HoverAndPressedButton
        style={styles.removeAllFilesBtn}
        onPress={removeAllFiles}
        disabled={!removeAllFiles || files.length === 0}
      >
        <Text style={styles.removeAllFilesText}>Remove all files</Text>
      </HoverAndPressedButton>
      {files && files.length > 0 && (
        <ScrollView style={styles.fileList}>
          {files.map((file, index) => {
            const invalidFile = invalidFiles.find(
              (item) => item.index === index,
            );
            const isInvalid = !!invalidFile;
            return (
              <>
                <View key={index} style={styles.fileItem}>
                  <Icon name="FileIcon" size={16} color={theme.text} />
                  <Text
                    style={[
                      styles.fileName,
                      isInvalid && styles.invalidFileName,
                    ]}
                  >
                    {file.name || file.fileName}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(file.size || file.fileSize)}
                  </Text>
                  <HoverAndPressedButton
                    style={styles.removeBtn}
                    onPress={() => onRemoveFile(index)}
                  >
                    <Icon name="Cancel01Icon" size={14} color={theme.text} />
                  </HoverAndPressedButton>
                </View>
                {isInvalid && (
                  <Text style={styles.fileError}>
                    {invalidFile.errors.join(", ")}
                  </Text>
                )}
              </>
            );
          })}
        </ScrollView>
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
      maxHeight: 250,
      ...(getPlatform() === "web" && {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::WebkitScrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::WebkitScrollbarTrack": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    fileName: {
      color: theme.text,
      fontSize: 12,
      marginLeft: 8,
      flex: 1,
    },
    invalidFileName: {
      color: "red",
      textDecorationLine: "line-through",
    },
    fileError: {
      color: "red",
      fontSize: 10,
      marginLeft: 4,
      marginBottom: 8,
    },
    fileSize: {
      color: theme.placeholderText,
      fontSize: 10,
      marginLeft: 8,
    },
    removeBtn: {
      marginLeft: 8,
    },
    removeAllFilesBtn: {
      marginTop: 10,
    },
    removeAllFilesText: {
      color: theme.placeholderText,
      fontSize: 10,
      userSelect: "none",
    },
  });

export default Dropzone;
