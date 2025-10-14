import React from "react";
import { Modal, StyleSheet, Pressable } from "react-native";
import Icon from "../Icon";

const ModalBase = ({ visible, onClose, children, theme }) => {
  const styles = createStyle(theme);
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container}>
          <Icon name={"Cancel01Icon"} style={styles.closeIcon} onPress={onClose}/>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.backgroundModalOverlay,
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: theme.backgroundModal,
      padding: 20,
      borderRadius: 15,
      shadowColor: theme.shadowColor,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    closeIcon: {
      alignSelf: "flex-end"
    },
  });
}

export default ModalBase;
