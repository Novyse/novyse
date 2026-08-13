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
  popover = false,
  title,
  titleTranslationKey,
  titleTranslationOptions,
}) => {
  const { isSmallScreen } = useScreen();
  const shouldUseFullscreen = fullscreen && isSmallScreen && !popover;
  const styles = createStyle(theme, shouldUseFullscreen, {
    hideOverlay,
    popover,
  });

  const [isRendered, setIsRendered] = useState(visible);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const wasVisibleRef = useRef(visible);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      wasVisibleRef.current = true;
      scaleValue.setValue(popover ? 1 : 0);
      opacityValue.setValue(0);

      const animations = [
        Animated.timing(opacityValue, { toValue: 1, ...OPEN_FADE }),
      ];

      if (!popover) {
        animations.unshift(
          Animated.spring(scaleValue, { toValue: 1, ...OPEN_SPRING }),
        );
      }

      Animated.parallel(animations).start();
      return;
    }

    if (!wasVisibleRef.current) {
      return;
    }

    wasVisibleRef.current = false;

    const animations = [
      Animated.timing(opacityValue, { toValue: 0, ...CLOSE_FADE }),
    ];

    if (!popover) {
      animations.unshift(Animated.timing(scaleValue, CLOSE_SCALE));
    }

    Animated.parallel(animations).start(() => {
      setIsRendered(false);
      scaleValue.setValue(0);
      opacityValue.setValue(0);
    });
  }, [visible, popover, scaleValue, opacityValue]);

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

  const content = (
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
          style={
            popover
              ? { opacity: opacityValue }
              : {
                  opacity: opacityValue,
                  transform: [{ scale: scaleValue }],
                }
          }
        >
          <BlurredView style={styles.container}>{renderBody()}</BlurredView>
        </Animated.View>
      </Pressable>
    </View>
  );

  if (popover) {
    return <View style={styles.popoverRoot}>{content}</View>;
  }

  return (
    <Modal
      visible={visible || isRendered}
      transparent={true}
      onRequestClose={onClose}
      animationType="none"
    >
      {content}
    </Modal>
  );
};

function createStyle(theme, shouldUseFullscreen, options = {}) {
  const { popover = false } = options;

  return StyleSheet.create({
    popoverRoot: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
      elevation: 1000,
    },
    overlay: {
      flex: 1,
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
      borderRadius: shouldUseFullscreen ? 0 : 25,
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
