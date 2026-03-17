import React, { useContext } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";
import { useActiveChatStore } from "@/context/ActiveChatContext";
import { formatFileSize, calculateTotalSize } from "@/src/utils/storage/file/utils";

const FilesBar = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  
  const files = useActiveChatStore((state) => state.files);
  const setFiles = useActiveChatStore((state) => state.setFiles);
  
  const activeChat = useActiveChatStore((state) => state.activeChatData);
  const settings = activeChat?.settings || {
      file: {
        singleFileSize: 52428800, // Fallback default
        totalFileSize: 2147483648,
        maxFiles: 100,
      }
  };
  
  const invalidFiles = useActiveChatStore((state) => state.invalidFiles) || [];
  const setInvalidFiles = useActiveChatStore((state) => state.setInvalidFiles);

  if (!files || files.length === 0) {
    return null;
  }
  
  const totalSize = calculateTotalSize(files);
  const maxTotalSize = settings.file.totalFileSize;

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Wait for validation to be handled cleanly somewhere else, 
      // but simpler: we run the check again
      
      const maxFiles = settings.file.maxFiles;
      const maxSingleSize = settings.file.singleFileSize;
      const maxTotal = settings.file.totalFileSize;

      const invalidData: any[] = [];
      let globalError: string | null = null;
      if (updated.length > maxFiles) {
        globalError = "Too many files. Maximum allowed: " + maxFiles;
      }
      if (calculateTotalSize(updated) > maxTotal) {
        globalError = "Total file size too large. Maximum allowed: " + formatFileSize(maxTotal);
      }
      
      updated.forEach((file, idx) => {
        const errors = [];
        const fileSize = file.size || file.fileSize || 0;
        if (fileSize > maxSingleSize) {
          errors.push("File size exceeds maximum allowed size of " + formatFileSize(maxSingleSize));
        }
        if (fileSize === 0) {
          errors.push("File size is 0. Please select a valid file.");
        }
        if (errors.length > 0) {
          invalidData.push({ index: idx, errors });
        }
      });
      if (globalError) {
        if (invalidData.length === 0 && updated.length > 0) {
          invalidData.push({ index: 0, errors: [globalError] });
        } else {
           invalidData.forEach(d => d.errors.push(globalError));
        }
      }
      setInvalidFiles(invalidData);
      
      return updated;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.limitsContainer}>
         <Text style={styles.limitsText}>
            Files limits: {files.length}/{settings.file.maxFiles} | {formatFileSize(totalSize)}/{formatFileSize(maxTotalSize)}
         </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {files.map((file, index) => {
          const invalidInfo = invalidFiles.find((item: any) => item.index === index);
          const isInvalid = !!invalidInfo;

          return (
            <View key={index} style={[styles.fileItemWrapper]}>
                <View style={[styles.fileItem, isInvalid && styles.invalidItem]}>
                  <View style={styles.fileIconContainer}>
                    <Icon name="FileIcon" size={24} color={isInvalid ? "red" : theme.icon} />
                  </View>
                  <Text style={[styles.fileName, isInvalid && { color: "red" }]} numberOfLines={1}>
                    {file.name || "File"}
                  </Text>
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={() => handleRemoveFile(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="Cancel01Icon" size={14} color={theme.text} />
                  </TouchableOpacity>
                </View>
                {isInvalid && (
                  <Text style={styles.errorText} numberOfLines={2}>
                    {invalidInfo.errors.join(", ")}
                  </Text>
                )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      width: "100%",
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingVertical: 8,
    },
    limitsContainer: {
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    limitsText: {
      color: theme.textSecondary || theme.text,
      fontSize: 12,
    },
    scrollContent: {
      paddingHorizontal: 14,
      gap: 12,
    },
    fileItemWrapper: {
      flexDirection: "column",
      maxWidth: 150,
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 8,
      paddingRight: 32,
      position: "relative",
      borderWidth: 1,
      borderColor: theme.border,
    },
    invalidItem: {
      borderColor: theme.danger || "red",
    },
    fileIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    fileName: {
      color: theme.text,
      fontSize: 14,
      flex: 1,
    },
    closeButton: {
      position: "absolute",
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.surfaceVariant || theme.border,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.background,
    },
    errorText: {
      marginTop: 4,
      fontSize: 10,
      color: theme.danger || "red",
    },
  });

export default FilesBar;
