import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

import ModalBase from "../ModalBase";
import Dropzone from "./Dropzone";
import Footer from "./Footer";

import { ThemeContext } from "@/context/ThemeContext";

const UploadFile = ({
  visible,
  onClose,
  type,
  handleFilePick,
  handleSendMessage,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const [files, setFiles] = useState([]);

  const handleOnChooseFile = async () => {
    const result = await handleFilePick(type, true);

    if (!result) return;
    setFiles((prev) => [...prev, ...result]);
  };

  const handleFooterRightButtonPress = () => {
    handleSendMessage(files);
    setFiles([]);
    onClose();
  };

  useEffect(() => {
    setFiles([]);
  }, [visible]);

  return (
    <ModalBase visible={visible} theme={theme} onClose={onClose}>
      <View style={styles.container}>
        <Dropzone
          title={"Drag and drop your file here"}
          subtitle={type + " is supported."}
          files={files}
          setFiles={setFiles}
          onChooseFile={handleOnChooseFile}
          maxFile={100}
          typeFile={"ALL"}
          theme={theme}
        />
        <Footer
          files={files}
          leftButtonText="Save to draft"
          rightButtonText="Send message"
          leftBtnOnPress={null}
          rightButtonOnPress={handleFooterRightButtonPress}
          theme={theme}
        />
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
