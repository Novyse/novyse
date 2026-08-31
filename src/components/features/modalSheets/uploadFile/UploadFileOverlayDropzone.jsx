import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import Icon from "@/src/components/ui/icon/Icon";
import Button from "@/src/components/ui/button/Button";

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
      <Typography weight="semibold" text={title} />
      <Typography size="xs" variant="subtitle">
        {subtitle} Max single size: {formatFileSize(maxSingleSize)} Max total
        size: {formatFileSize(maxTotalSize)} File Number: {maxFile}
      </Typography>
      <Button
        size="xs"
        translationKey="chat.uploadFile.chooseFile"
        onPress={onChooseFile}
        disabled={!onChooseFile}
        style={styles.actionButton}
      />
      {files.length > 0 && (
        <Button
          size="xs"
          translationKey="chat.uploadFile.removeAll"
          onPress={removeAllFiles}
          disabled={!removeAllFiles || files.length === 0}
          style={styles.actionButton}
        />
      )}

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
                  <View style={styles.fileItemContent}>
                    <Icon name="File01Icon" size={16} color={theme.text} />
                    <Typography
                      size="xs"
                      weight="semibold"
                      variant={isInvalid ? "danger" : "default"}
                      text={file.name || file.fileName}
                    />
                  </View>
                  <View style={styles.fileItemSize}>
                    <Typography
                      size="xs"
                      variant="subtitle"
                      text={formatFileSize(file.size || file.fileSize)}
                    />
                    <Icon
                      name="Cancel01Icon"
                      size={14}
                      color={theme.text}
                      onPress={() => onRemoveFile(index)}
                    />
                  </View>
                </View>
                {isInvalid && (
                  <Typography
                    size="xs"
                    variant="danger"
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
      borderRadius: 25,
      padding: 25,
      alignItems: "center",
      gap: 25,
      marginBottom: 25,
    },
    actionButton: {
      alignSelf: "center",
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
    fileItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    fileItemSize: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
  });

export default UploadFileOverlayDropzone;
