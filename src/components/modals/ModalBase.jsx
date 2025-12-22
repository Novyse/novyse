import React from "react";
import {
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import Icon from "../Icon";
import BlurredView from "../BlurredView";

const ModalBase = ({
  visible,
  onClose,
  children,
  theme,
  hideCloseX = false,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const styles = createStyle(theme, screenWidth, screenHeight);
  return (
    <Modal visible={visible} transparent={true} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurredView style={styles.container} intensity={40}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <Pressable>
              {!hideCloseX && (
                <Icon
                  name={"Cancel01Icon"}
                  style={styles.closeIcon}
                  onPress={onClose}
                />
              )}
              {children}
            </Pressable>
          </ScrollView>
        </BlurredView>
      </Pressable>
    </Modal>
  );
};

function createStyle(theme, screenWidth, screenHeight) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.backgroundModalOverlay,
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
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
      width: "100%",
      maxWidth: Math.min(500, screenWidth),
      maxHeight: Math.min(900, screenHeight),
      marginHorizontal: 10,
    },
    scrollView: {
      flex: 1,
    },
    closeIcon: {
      alignSelf: "flex-end",
    },
  });
}

export default ModalBase;
