import React from "react";
import { Modal, StyleSheet, Pressable, ScrollView, View } from "react-native";
import BlurredView from "../BlurredView";
import ModalHeader from "./ModalHeader";
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
  title,
  titleTranslationKey,
  titleTranslationOptions,
  titleStyle,
}) => {
  const { isSmallScreen } = useScreen();
  const shouldUseFullscreen = fullscreen && isSmallScreen && !popover;
  const styles = createStyle(theme, shouldUseFullscreen, {
    hideOverlay,
    popover,
  });

  if (!visible) {
    return null;
  }

  const renderBody = () => (
    <View style={styles.inner}>
      <ModalHeader
        title={title}
        titleTranslationKey={titleTranslationKey}
        titleTranslationOptions={titleTranslationOptions}
        titleStyle={titleStyle}
        hideCloseX={hideCloseX}
        onClose={onClose}
        theme={theme}
      />
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </View>
  );

  const content = (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.modalAnchor} onPress={() => {}}>
        <BlurredView style={styles.container}>{renderBody()}</BlurredView>
      </Pressable>
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
      animationType="none"
    >
      {content}
    </Modal>
  );
};

function createStyle(theme, shouldUseFullscreen, options = {}) {
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
      paddingVertical: shouldUseFullscreen ? 0 : 24,
      paddingHorizontal: shouldUseFullscreen ? 0 : popover ? 0 : 10,
    },
    modalAnchor: {
      width: shouldUseFullscreen ? "100%" : popover ? undefined : "100%",
      maxWidth: shouldUseFullscreen ? "100%" : popover ? undefined : 520,
      maxHeight: popover ? undefined : "100%",
      flexShrink: popover ? 0 : 1,
      alignSelf: popover ? "flex-end" : "center",
      marginRight: 0,
      marginBottom: popover ? 45 : 0,
    },
    container: {
      borderRadius: shouldUseFullscreen ? 0 : 15,
      elevation: 5,
      width: shouldUseFullscreen ? "100%" : undefined,
      maxHeight: popover ? undefined : "100%",
      flexShrink: popover ? 0 : 1,
    },
    inner: {
      padding: 25,
      maxHeight: popover ? undefined : "100%",
      flexShrink: popover ? 0 : 1,
    },
    scrollView: {
      flexShrink: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    body: {
      flexShrink: popover ? 0 : 1,
    },
  });
}

export default ModalBase;
