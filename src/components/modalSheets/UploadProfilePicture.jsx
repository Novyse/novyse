import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";

import ModalBase from "@/src/components/modalSheets/ModalBase";
import Avatar from "@/src/components/Avatar";
import Dropzone from "@/src/components/modalSheets/uploadFile/Dropzone";
import Footer from "@/src/components/modalSheets/uploadFile/Footer";
import StatusMessage from "@/src/components/StatusMessage";
import WebDropZone from "@/src/components/input/WebDropZone";

import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";

import useUploadFile from "@/src/hooks/modal/useUploadFile";
import useAttachHandlers from "@/src/hooks/chat/useAttachHandlers";

import eventEmitter from "@/src/utils/global/Events/EventEmitter";
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
      const { success: confirmSuccess } = confirmResponse;
      if (!confirmSuccess)
        throw new Error("Failed to confirm upload with backend");

      // Update local state
      // Add to database

      await database.file.add(
        fileUUID,
        file.name || file.fileName,
        file.mimeType,
        file.size || file.fileSize,
      );

      // Add file to local storage
      const { ref, size } = await storage.save.byUri(file.uri);

      // Add ref to database
      await database.file.update.ref(fileUUID, ref);

      // Link to local user
      await eventEmitter.user.profile.update({
        userUUID: myUUID,
        profilePictureUUID: fileUUID,
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
  });
};

export default UploadProfilePicture;
