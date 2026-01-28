import React from "react";
import {
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
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
  const isSmallScreen = screenWidth < 768;
  const styles = createStyle(theme, screenWidth, screenHeight, isSmallScreen);

  const ContainerComponent = isSmallScreen ? View : BlurredView;
  const containerProps = isSmallScreen ? {} : { intensity: 40 };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <ContainerComponent style={styles.container} {...containerProps}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentStyle}
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
        </ContainerComponent>
      </Pressable>
    </Modal>
  );
};

function createStyle(theme, screenWidth, screenHeight, isSmallScreen) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: isSmallScreen ? undefined : theme.backgroundModalOverlay,
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      padding: 20,
      backgroundColor: isSmallScreen ? theme.backgroundModal : undefined,
      borderRadius: isSmallScreen ? 0 : 15,
      shadowColor: theme.shadowColor,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: isSmallScreen ? "100%" : "90%",
      maxWidth: isSmallScreen ? "100%" : 500,
      height: isSmallScreen ? "100%" : "auto",
      maxHeight: isSmallScreen ? "100%" : screenHeight * 0.9,
      marginHorizontal: isSmallScreen ? 0 : 10,
    },
    scrollView: {
      maxHeight: "100%",
    },
    closeIcon: {
      alignSelf: "flex-end",
    },
    contentStyle: {
      flexGrow: isSmallScreen ? 1 : null,
      alignContent: "center",
      justifyContent: "center",
    },
  });
}

export default ModalBase;
