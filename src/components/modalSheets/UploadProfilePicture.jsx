import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";

import ModalBase from "@/src/components/modalSheets/ModalBase";
import Avatar from "@/src/components/Avatar";
import Dropzone from "@/src/components/modalSheets/uploadFile/Dropzone";
import Footer from "@/src/components/modalSheets/uploadFile/Footer";
import StatusMessage from "@/src/components/StatusMessage";
import WebDropZone from "@/src/components/input/WebDropZone";

import { ThemeContext } from "@/context/ThemeContext";
import useUserStore from "@/context/UserContext";

import useUploadFile from "@/src/hooks/modal/useUploadFile.js";
import useAttachHandlers from "@/src/hooks/chat/useAttachHandlers.js";

import eventEmitter from "@/src/utils/global/Events/EventEmitter.js";
import gateway from "@/src/utils/backend-services/api-gateway";
import S3Uploader from "@/src/utils/storage/file/s3Bucket";
import storage from "@/src/utils/storage/file";
import database from "@/src/utils/storage/database";

const UploadProfilePicture = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const myUUID = useUserStore((state) => state.localUserUUID);
  const myProfilePictureUUID = useUserStore(
    (state) => state.users[myUUID]?.profilePictureUUID,
  );

  const maxFile = 1;
  const maxSingleSize = 52428800; // 50MB
  const maxTotalSize = 52428800; // 2GB

  const type = "Image";

  const {
    files,
    setFiles,
    error,
    setError,
    invalidFiles,
    setInvalidFiles,
    checkErrors,
    removeAllFiles,
    removeFileAtIndex,
  } = useUploadFile(type, maxFile, maxSingleSize, maxTotalSize);

  const { handleFilePick } = useAttachHandlers();

  const handleOnChooseFile = async () => {
    const result = await handleFilePick(type, true);

    if (!result) return;

    onFileDrop(result);
  };

  const onFileDrop = async (result) => {
    console.log(result);
    const newFiles = [...files, ...result];
    setFiles(newFiles);

    // Validate files
    checkErrors(newFiles);
  };

  const uploadProfilePicture = async () => {
    try {
      const file = files[0];
      if (!file) throw new Error("No file to upload");
      // Get presigned URL from backend
      const presignResponse = await gateway.user.profile.picture.update(
        file.name || file.fileName,
        file.type || file.mimeType,
        file.size || file.fileSize,
      );
      const { success, fileUUID, uploadURL, expiresAt } = presignResponse;
      if (!success) throw new Error("Failed to get presigned URL");

      // Upload to S3
      const uploadResult = await S3Uploader.upload(
        uploadURL,
        file.uri,
        () => {},
      );
      if (!uploadResult) throw new Error("Failed to upload file to S3");

      // Confirm upload to backend
      const confirmResponse =
        await gateway.user.profile.picture.confirm(fileUUID);
      const { success: confirmSuccess, profilePictureUUID } = confirmResponse;
      if (!confirmSuccess)
        throw new Error("Failed to confirm upload with backend");

      // Update local state
      // Add to database

      await database.file.add(
        profilePictureUUID,
        file.name || file.fileName,
        file.mimeType,
        file.size || file.fileSize,
      );

      // Add file to local storage
      const { ref, size } = await storage.save.byUri(file.uri);

      // Add ref to database
      await database.file.update.ref(profilePictureUUID, ref);

      // Link to local user
      await eventEmitter.user.profile.update({
        userUUID: myUUID,
        profilePictureUUID,
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setError("Error uploading profile picture: " + error.message);
    }
  };

  const handleFooterRightButtonPress = async () => {
    if (files.length === 0) return;
    if (invalidFiles.length > 0) return;
    if (error) return;

    if (checkErrors(files)) return;

    await uploadProfilePicture();
    setFiles([]);
    setError(null);
    setInvalidFiles([]);
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      theme={theme}
      hideCloseX={true}
    >
      <View style={styles.container}>
        {/* Avatar Preview */}
        <View style={styles.avatarContainer}>
          <Avatar
            uuid={
              myProfilePictureUUID &&
              (!files[0] || !!error || invalidFiles.length > 0)
                ? myProfilePictureUUID
                : null
            }
            uri={
              files[0] && !error && invalidFiles.length === 0
                ? files[0].uri
                : null
            }
            size={120}
            theme={theme}
          />
        </View>

        {/* Dropzone */}
        <Dropzone
          title="Drag and drop your image here"
          subtitle="JPG, PNG or GIF."
          files={files}
          onChooseFile={handleOnChooseFile}
          onRemoveFile={removeFileAtIndex}
          removeAllFiles={removeAllFiles}
          invalidFiles={invalidFiles}
          maxSingleSize={maxSingleSize}
          maxTotalSize={maxTotalSize}
          maxFile={maxFile}
          typeFile={type}
          theme={theme}
        />
        {/* Footer Buttons */}
        <Footer
          leftButtonText="Cancel"
          rightButtonText="Upload"
          leftBtnOnPress={onClose}
          rightButtonOnPress={handleFooterRightButtonPress}
          leftBtnDisabled={false}
          rightBtnDisabled={
            files.length === 0 || invalidFiles.length > 0 || !!error
          }
          theme={theme}
        />
        {error && (
          <StatusMessage
            isVisible={true}
            type="error"
            content={[error]}
            onClose={() => {
              setError(null);
            }}
          />
        )}
      </View>
      <WebDropZone onFilesDropped={onFileDrop} />
    </ModalBase>
  );
};

const createStyles = (theme) => {
  return StyleSheet.create({
    container: {
      marginTop: 10,
      padding: 20,
      maxWidth: "100%",
    },
    closeButton: {
      position: "absolute",
      right: 20,
      top: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 8,
      fontFamily: "serif", // Per richiamare lo stile del font nell'immagine
    },
    subtitle: {
      fontSize: 14,
      color: "#8E8E93",
      marginBottom: 24,
    },
    avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      overflow: "hidden",
      marginBottom: 30,
      borderWidth: 2,
      borderColor: theme.primary,
      alignSelf: "center",
    },
    avatar: {
      width: "100%",
      height: "100%",
    },
    dropzone: {
      width: "100%",
      borderWidth: 1,
      borderColor: "#1A3A5F",
      borderStyle: "dashed", // Nota: React Native supporta dashed solo su iOS o con workaround
      borderRadius: 20,
      padding: 30,
      alignItems: "center",
      backgroundColor: "rgba(0, 102, 255, 0.02)",
      marginBottom: 24,
    },
    dropzoneTitle: {
      color: "#FFFFFF",
      fontWeight: "600",
      marginTop: 12,
    },
    dropzoneNote: {
      color: "#4E5D78",
      fontSize: 12,
      marginTop: 4,
      marginBottom: 15,
    },
    chooseFileBtn: {
      backgroundColor: "#1A1D23",
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    chooseFileText: {
      color: "#FFFFFF",
      fontSize: 13,
    },
    footer: {
      flexDirection: "row",
      width: "100%",
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 25,
      borderWidth: 1,
      borderColor: "#1A1D23",
    },
    cancelText: {
      color: "#FFFFFF",
      fontWeight: "600",
    },
    saveBtn: {
      flex: 1,
      height: 50,
      backgroundColor: "#1867FF",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 25,
      // Ombra blu per l'effetto glow
      shadowColor: "#1867FF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    saveText: {
      color: "#FFFFFF",
      fontWeight: "600",
    },
  });
};

export default UploadProfilePicture;
