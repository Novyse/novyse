import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";

import { formatFileSize } from "@/src/utils/storage/file/utils";
import { ScrollBar } from "@/constants/ScrollBar";

const UploadFileOverlayDropzone = ({
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
        <Icon name="CloudUploadIcon" color={theme.text} />
      </View>
      <Typography style={styles.title} text={title} />
      <Typography style={styles.note}>
        {subtitle} Max single size: {formatFileSize(maxSingleSize)} Max total
        size: {formatFileSize(maxTotalSize)} File Number: {maxFile}
      </Typography>
      <HoverAndPressedButton
        style={styles.chooseFileBtn}
        onPress={onChooseFile}
        disabled={!onChooseFile}
      >
        <Typography
          style={styles.chooseFileText}
          translationKey="chat.uploadFile.chooseFile"
        />
      </HoverAndPressedButton>
      <HoverAndPressedButton
        style={styles.removeAllFilesBtn}
        onPress={removeAllFiles}
        disabled={!removeAllFiles || files.length === 0}
      >
        <Typography
          style={styles.removeAllFilesText}
          translationKey="chat.uploadFile.removeAll"
        />
      </HoverAndPressedButton>
      {files && files.length > 0 && (
        <ScrollView style={styles.fileList}>
          {files.map((file, index) => {
            const invalidFile = invalidFiles.find(
              (item) => item.index === index,
            );
            const isInvalid = !!invalidFile;
            return (
              <React.Fragment key={index}>
                <View style={styles.fileItem}>
                  <Icon name="FileIcon" size={16} color={theme.text} />
                  <Typography
                    style={[
                      styles.fileName,
                      isInvalid && styles.invalidFileName,
                    ]}
                    text={file.name || file.fileName}
                  />
                  <Typography
                    style={styles.fileSize}
                    text={formatFileSize(file.size || file.fileSize)}
                  />
                  <HoverAndPressedButton
                    style={styles.removeBtn}
                    onPress={() => onRemoveFile(index)}
                  >
                    <Icon name="Cancel01Icon" size={14} color={theme.text} />
                  </HoverAndPressedButton>
                </View>
                {isInvalid && (
                  <Typography
                    style={styles.fileError}
                    text={invalidFile.errors.join(", ")}
                  />
                )}
              </React.Fragment>
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
      ...ScrollBar(theme),
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
      color: theme.dangerText,
      textDecorationLine: "line-through",
    },
    fileError: {
      color: theme.dangerText,
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

export default UploadFileOverlayDropzone;
