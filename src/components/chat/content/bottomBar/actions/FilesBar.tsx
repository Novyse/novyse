import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";
import BlurredView from "@/src/components/BlurredView";
import { useActiveChatStore } from "@/context/ActiveChatContext";
import {
  formatFileSize,
  calculateTotalSize,
} from "@/src/utils/storage/file/utils";

const FilesBar = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const files = useActiveChatStore((state) => state.files);
  const setFiles = useActiveChatStore((state) => state.setFiles);
  const activeChat = useActiveChatStore((state) => state.activeChatData);
  const settings = activeChat?.settings || {
    file: {
      singleFileSize: 52428800,
      totalFileSize: 2147483648,
      maxFiles: 100,
    },
  };
  const invalidFiles = useActiveChatStore((state) => state.invalidFiles) || [];
  const setInvalidFiles = useActiveChatStore((state) => state.setInvalidFiles);

  if (!files || files.length === 0) return null;

  const totalSize = calculateTotalSize(files);
  const maxTotalSize = settings.file.totalFileSize;
  const isNearLimit = totalSize / maxTotalSize > 0.8;

  const handleClearAll = () => {
    setFiles([]);
    setInvalidFiles([]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const {
        maxFiles,
        singleFileSize: maxSingleSize,
        totalFileSize: maxTotal,
      } = settings.file;
      const invalidData: any[] = [];
      let globalError: string | null = null;

      if (updated.length > maxFiles) globalError = `Max ${maxFiles} files`;
      if (calculateTotalSize(updated) > maxTotal)
        globalError = `Total exceeds ${formatFileSize(maxTotal)}`;

      updated.forEach((file, idx) => {
        const errors: string[] = [];
        const fileSize = file.size || file.fileSize || 0;
        if (fileSize > maxSingleSize)
          errors.push(`Exceeds ${formatFileSize(maxSingleSize)}`);
        if (fileSize === 0) errors.push("Empty file");
        if (errors.length > 0) invalidData.push({ index: idx, errors });
      });

      if (globalError) {
        if (invalidData.length === 0 && updated.length > 0)
          invalidData.push({ index: 0, errors: [globalError] });
        else invalidData.forEach((d) => d.errors.push(globalError));
      }

      setInvalidFiles(invalidData);
      return updated;
    });
  };

  return (
    <BlurredView style={styles.container}>
      <View style={styles.header}>
        <Icon name="FileAttachmentIcon" size={18} color={theme.icon} />
        <View style={styles.accent} />
        <View style={styles.headerMeta}>
          <Text
            style={[styles.headerTitle, { color: theme.icon }]}
            numberOfLines={1}
          >
            {files.length} {files.length === 1 ? "file" : "files"}
          </Text>
          <Text
            style={[styles.headerSub, isNearLimit && styles.headerSubDanger]}
            numberOfLines={1}
          >
            {formatFileSize(totalSize)} / {formatFileSize(maxTotalSize)}
          </Text>
        </View>
        <Icon
          name="Cancel01Icon"
          size={18}
          color={theme.placeholderText}
          onPress={handleClearAll}
        />
      </View>

      <View style={styles.divider} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ borderRadius: 10 }}
        decelerationRate="fast"
      >
        {files.map((file, index) => {
          const invalidInfo = invalidFiles.find(
            (item: any) => item.index === index,
          );
          const isInvalid = !!invalidInfo;
          const fileSize = file.size || file.fileSize || 0;
          const name = file.name || "File";

          return (
            <View key={index} style={styles.chipOuter}>
              <View style={[styles.chip, isInvalid && styles.chipInvalid]}>
                <Icon
                  name="FileIcon"
                  size={18}
                  color={isInvalid ? theme.errorText || "#FF4D4D" : theme.icon}
                />
                <View style={styles.chipText}>
                  <Text
                    style={[
                      styles.chipName,
                      isInvalid && styles.chipNameInvalid,
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text style={styles.chipSize}>{formatFileSize(fileSize)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFile(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name="Cancel01Icon"
                    size={18}
                    color={theme.placeholderText}
                  />
                </TouchableOpacity>
              </View>
              {isInvalid && (
                <Text style={styles.errorText} numberOfLines={1}>
                  {invalidInfo.errors[0]}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </BlurredView>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 5,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    accent: {
      width: 3,
      borderRadius: 2,
      alignSelf: "stretch",
      backgroundColor: theme.icon,
    },
    headerMeta: {
      flex: 1,
    },
    headerTitle: {
      fontWeight: "600",
      fontSize: 13,
    },
    headerSub: {
      fontSize: 13,
      color: theme.placeholderText,
    },
    headerSubDanger: {
      color: theme.danger || "#FF4D4D",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginHorizontal: -15,
    },
    scrollContent: {
      gap: 8,
      alignItems: "flex-start",
    },
    chipOuter: {
      gap: 3,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.primary,
      overflow: "hidden",
    },
    chipInvalid: {
      borderColor: theme.danger || "#FF4D4D",
    },
    chipText: {
      flex: 1,
      maxWidth: 130,
    },
    chipName: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.text,
    },
    chipNameInvalid: {
      color: theme.danger || "#FF4D4D",
    },
    chipSize: {
      fontSize: 11,
      color: theme.placeholderText,
    },
    errorText: {
      fontSize: 11,
      color: theme.danger || "#FF4D4D",
      paddingHorizontal: 4,
    },
  });

export default FilesBar;