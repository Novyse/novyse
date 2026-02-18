import React from "react";
import {
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Icon from "../Icon";
import BlurredView from "../BlurredView";

import { useScreen } from "@/context/ScreenContext";

const ModalBase = ({
  visible,
  onClose,
  children,
  theme,
  hideCloseX = false,
  scrollable = true,
}) => {
  const { isSmallScreen } = useScreen();
  const styles = createStyle(theme,  isSmallScreen);

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
          {scrollable ? (
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
          ) : (
            <View style={styles.scrollView}>
              <Pressable style={styles.contentStyle}>
                {!hideCloseX && (
                  <Icon
                    name={"Cancel01Icon"}
                    style={styles.closeIcon}
                    onPress={onClose}
                  />
                )}
                {children}
              </Pressable>
            </View>
          )}
        </ContainerComponent>
      </Pressable>
    </Modal>
  );
};

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: isSmallScreen ? undefined : theme.backgroundModalOverlay,
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
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
      width: isSmallScreen ? "100%" : "auto",
      height: isSmallScreen ? "100%" : "auto",
      maxWidth: isSmallScreen ? "100%" : "90%",
      maxHeight: isSmallScreen ? "100%" : "90%",
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
