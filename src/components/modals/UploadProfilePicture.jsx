import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
} from "react-native";

import ModalBase from "./ModalBase";
import Dropzone from "./uploadFile/Dropzone";
import Footer from "./uploadFile/Footer";

import { ThemeContext } from "@/context/ThemeContext";

const UploadProfilePicture = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.container}>
        {/* Avatar Preview */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: "https://picsum.photos/200" }} // Sostituisci con l'immagine reale
            style={styles.avatar}
          />
        </View>

        {/* Dropzone */}
        <Dropzone
          title="Drag and drop your image here"
          subtitle="JPG, PNG or GIF."
          maxFile={1}
          maxSingleSize={52428800}
          maxTotalSize={52428800}
          typeFile="IMAGE"
          theme={theme}
        />
        {/* Footer Buttons */}
        <Footer
          leftButtonText="Cancel"
          rightButtonText="Upload"
          leftBtnOnPress={onClose}
          rightButtonOnPress={() => {}}
          theme={theme}
        />
      </View>
    </ModalBase>
  );
};

const createStyles = (theme) => {
  return StyleSheet.create({
    container: {
      marginTop: 10,
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
      borderColor: "#1A1D23",
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
