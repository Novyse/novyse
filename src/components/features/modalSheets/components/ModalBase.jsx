import { useState, useRef, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  View,
  Animated,
  Easing,
} from "react-native";
import BlurredView from "@/src/components/layout/BlurredView";
import ModalHeader from "./ModalHeader";
import { useScreen } from "@/src/context/ScreenContext";

const OPEN_SPRING = { friction: 6, tension: 40, useNativeDriver: true };
const OPEN_FADE = { duration: 200, useNativeDriver: true };
const CLOSE_SCALE = {
  toValue: 0.6,
  duration: 220,
  easing: Easing.out(Easing.quad),
  useNativeDriver: true,
};
const CLOSE_FADE = { duration: 200, useNativeDriver: true };

const ModalBase = ({
  visible,
  onClose,
  children,
  theme,
  hideCloseX = false,
  scrollable = true,
  fullscreen = false,
  hideOverlay = false,
  title,
  titleTranslationKey,
  titleTranslationOptions,
}) => {
  const { isSmallScreen } = useScreen();
  const shouldUseFullscreen = fullscreen && isSmallScreen;
  const styles = createStyle(shouldUseFullscreen);

  const [isRendered, setIsRendered] = useState(visible);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const wasVisibleRef = useRef(visible);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      wasVisibleRef.current = true;
      scaleValue.setValue(0);
      opacityValue.setValue(0);

      Animated.parallel([
        Animated.spring(scaleValue, { toValue: 1, ...OPEN_SPRING }),
        Animated.timing(opacityValue, { toValue: 1, ...OPEN_FADE }),
      ]).start();
      return;
    }

    if (!wasVisibleRef.current) {
      return;
    }

    wasVisibleRef.current = false;

    Animated.parallel([
      Animated.timing(scaleValue, CLOSE_SCALE),
      Animated.timing(opacityValue, { toValue: 0, ...CLOSE_FADE }),
    ]).start(() => {
      setIsRendered(false);
      scaleValue.setValue(0);
      opacityValue.setValue(0);
    });
  }, [visible, scaleValue, opacityValue]);

  if (!visible && !isRendered) {
    return null;
  }

  const backdropColor = hideOverlay
    ? "transparent"
    : theme.backgroundModalOverlay;

  const renderBody = () => (
    <View style={styles.inner}>
      <ModalHeader
        title={title}
        titleTranslationKey={titleTranslationKey}
        titleTranslationOptions={titleTranslationOptions}
        hideCloseX={hideCloseX}
        onClose={onClose}
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

  return (
    <Modal
      visible={visible || isRendered}
      transparent={true}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: backdropColor, opacity: opacityValue },
            ]}
          />
        </Pressable>
        <Pressable style={styles.modalAnchor} onPress={() => {}}>
          <Animated.View
            style={{
              opacity: opacityValue,
              transform: [{ scale: scaleValue }],
            }}
          >
            <BlurredView style={styles.container}>{renderBody()}</BlurredView>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
};

function createStyle(shouldUseFullscreen) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: shouldUseFullscreen ? 0 : 24,
      paddingHorizontal: shouldUseFullscreen ? 0 : 10,
    },
    modalAnchor: {
      width: "100%",
      maxWidth: shouldUseFullscreen ? "100%" : 520,
      maxHeight: "100%",
      flexShrink: 1,
      alignSelf: "center",
    },
    container: {
      borderRadius: shouldUseFullscreen ? 0 : 25,
      elevation: 5,
      width: shouldUseFullscreen ? "100%" : undefined,
      maxHeight: "100%",
      flexShrink: 1,
    },
    inner: {
      padding: 25,
      maxHeight: "100%",
      flexShrink: 1,
    },
    scrollView: {
      flexShrink: 1,
    },
    scrollContent: {},
    body: {
      flexShrink: 1,
    },
  });
}

export default ModalBase;
