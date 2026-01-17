import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

import ModalBase from "../ModalBase";
import Dropzone from "./Dropzone";
import Footer from "./Footer";

import StatusMessage from "../../StatusMessage";

import { ThemeContext } from "@/context/ThemeContext";

import useUploadFile from "@/src/hooks/modal/useUploadFile";

const UploadFile = ({
  visible,
  onClose,
  type,
  handleFilePick,
  handleSendMessage,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const maxFile = 100;
  const maxSingleSize = 52428800; // 50MB
  const maxTotalSize = 2147483648; // 2GB

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
  } = useUploadFile("All", maxFile, maxSingleSize, maxTotalSize);

  const handleOnChooseFile = async () => {
    if (invalidFiles.length > 0) return;
    if (error) return;

    const result = await handleFilePick(type, true);

    if (!result) return;

    const newFiles = [...files, ...result];
    setFiles(newFiles);

    // Validate files
    checkErrors(newFiles);
  };

  const handleFooterRightButtonPress = () => {
    if (files.length === 0) return;
    if (invalidFiles.length > 0) return;
    if (error) return;

    if (checkErrors(files)) return;

    handleSendMessage(files);
    setFiles([]);
    setError(null);
    setInvalidFiles([]);
    onClose();
  };

  return (
    <ModalBase visible={visible} theme={theme} onClose={onClose}>
      <View style={styles.container}>
        <Dropzone
          title={"Drag and drop your file here"}
          subtitle={type + " is supported."}
          files={files}
          onChooseFile={handleOnChooseFile}
          onRemoveFile={removeFileAtIndex}
          removeAllFiles={removeAllFiles}
          invalidFiles={invalidFiles}
          maxSingleSize={maxSingleSize}
          maxTotalSize={maxTotalSize}
          maxFile={maxFile}
          typeFile={"All"}
          theme={theme}
        />
        <Footer
          files={files}
          leftButtonText="Save to draft"
          rightButtonText="Send message"
          leftBtnOnPress={null}
          rightButtonOnPress={handleFooterRightButtonPress}
          leftBtnDisabled={true}
          rightBtnDisabled={files.length === 0 || invalidFiles.length > 0 || !!error}
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
    </ModalBase>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      marginTop: 10,
      maxWidth: "100%",
    },
  });

export default UploadFile;
