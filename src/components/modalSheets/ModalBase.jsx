import React from "react";
import { Modal, StyleSheet, Pressable, ScrollView, View } from "react-native";
import Icon from "../Icon";
import BlurredView from "../BlurredView";

import { useScreen } from "@/src/context/ScreenContext";

const ModalBase = ({
  visible,
  onClose,
  children,
  theme,
  hideCloseX = false,
  scrollable = true,
  fullscreen = false,
  hideOverlay = false,
  popover = false,
}) => {
  const { isSmallScreen } = useScreen();
  const shouldUseFullscreen = fullscreen && isSmallScreen && !popover;
  const styles = createStyle(theme, isSmallScreen, shouldUseFullscreen, {
    hideOverlay,
    popover,
  });

  const ContainerComponent = popover ? View : BlurredView;
  const containerProps = popover ? {} : { intensity: 40 };

  if (!visible) {
    return null;
  }

  const content = (
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
  );

  if (popover) {
    return <View style={styles.popoverRoot}>{content}</View>;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      {content}
    </Modal>
  );
};

function createStyle(theme, isSmallScreen, shouldUseFullscreen, options = {}) {
  const { hideOverlay = false, popover = false } = options;

  return StyleSheet.create({
    popoverRoot: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
      elevation: 1000,
    },
    overlay: {
      flex: 1,
      backgroundColor: hideOverlay
        ? "transparent"
        : theme.backgroundModalOverlay,
      justifyContent: popover ? "flex-end" : "center",
      alignItems: popover ? "flex-start" : "center",
    },
    container: {
      backgroundColor: popover ? theme.backgroundMain : undefined,
      borderRadius: shouldUseFullscreen ? 0 : 15,
      shadowColor: theme.shadowColor,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: popover ? 3 : 4,
      elevation: 5,
      width: shouldUseFullscreen ? "100%" : "auto",
      height: shouldUseFullscreen ? "100%" : "auto",
      maxWidth: shouldUseFullscreen ? "100%" : popover ? undefined : "90%",
      maxHeight: shouldUseFullscreen ? "100%" : popover ? undefined : "90%",
      marginHorizontal: shouldUseFullscreen ? 0 : popover ? 0 : 10,
      marginLeft: popover ? 10 : 0,
      marginBottom: popover ? 70 : 0,
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
