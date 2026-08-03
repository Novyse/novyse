import { useEffect, useState, useContext } from "react";
import { View, StyleSheet, Linking } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import HoverAndPressedButton from "./HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import AppText from "./ui/text/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";

type StatusMessageType = "success" | "error" | "warning" | "info";

interface StatusMessageProps {
  type: StatusMessageType;
  visible?: boolean;
  content?: string[];
  translationKey?: string;
  timeout?: number | null;
  onClose?: () => void;
  closable?: boolean;
  iconOnly?: boolean;
}

interface ThemeColors {
  bg: string;
  text: string;
}

interface TypeValues {
  title: string;
  icon: { name: string; color: string };
  theme: ThemeColors;
}

const StatusMessage = ({
  type,
  visible = true,
  content = [],
  translationKey,
  timeout = null,
  onClose,
  closable = true,
  iconOnly = false,
}: StatusMessageProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(visible);
  const fade = useSharedValue(0);
  const slide = useSharedValue(10);
  const progress = useSharedValue(1);
  const trackWidth = useSharedValue(0);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const hide = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleClose = () => {
    fade.value = withTiming(0, { duration: 200 });
    slide.value = withTiming(10, { duration: 200 }, () => runOnJS(hide)());
  };

  useEffect(() => {
    if (!isVisible) {
      fade.value = 0;
      slide.value = 10;
      progress.value = 1;
      return;
    }
    fade.value = withTiming(1, { duration: 300 });
    slide.value = withTiming(0, { duration: 300 });
    if (timeout) {
      progress.value = 1;
      progress.value = withTiming(0, { duration: timeout });
      const t = setTimeout(handleClose, timeout);
      return () => clearTimeout(t);
    }
  }, [isVisible, timeout]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }));
  const progressFillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -trackWidth.value / 2 },
      { scaleX: progress.value },
      { translateX: trackWidth.value / 2 },
    ],
  }));

  if (!isVisible) return null;

  const getTypeValues = (): TypeValues => {
    switch (type) {
      case "success":
        return {
          title: "Success",
          icon: { name: "CheckmarkCircle02Icon", color: theme.successText },
          theme: { bg: theme.backgroundSuccess, text: theme.successText },
        };
      case "error":
        return {
          title: "Error",
          icon: { name: "AlertCircleIcon", color: theme.dangerText },
          theme: { bg: theme.backgroundDanger, text: theme.dangerText },
        };
      case "warning":
        return {
          title: "Warning",
          icon: { name: "Alert02Icon", color: theme.warningText },
          theme: { bg: theme.backgroundWarning, text: theme.warningText },
        };
      case "info":
      default:
        return {
          title: "Info",
          icon: { name: "InformationCircleIcon", color: theme.infoText },
          theme: { bg: theme.backgroundInfo, text: theme.infoText },
        };
    }
  };

  const { title: titleKey, icon, theme: colors } = getTypeValues();
  const styles = createStyles(colors);
  const list = Array.isArray(content) ? content : [];

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={[styles.inner, iconOnly && styles.innerCompact]}>
        <View
          style={[
            styles.iconContainer,
            iconOnly && styles.iconContainerCompact,
          ]}
        >
          <Icon name={icon.name} size={20} color={icon.color} />
        </View>

        {!iconOnly && (
          <>
            <View style={styles.contentContainer}>
              <AppText
                style={styles.title}
                translationKey={`common.status.${titleKey.toLowerCase()}`}
              />
              {translationKey ? (
                <AppText
                  style={styles.contentText}
                  translationKey={translationKey}
                />
              ) : (
                list.map((value, index) => {
                  const formattedText =
                    (list.length > 1 ? `• ${value}` : value) ?? "";
                  const linkRegex =
                    /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
                  const parts = [];
                  let lastIndex = 0;
                  let match;

                  while ((match = linkRegex.exec(formattedText)) !== null) {
                    if (match.index > lastIndex) {
                      parts.push(
                        formattedText.substring(lastIndex, match.index),
                      );
                    }
                    const url = match[2];
                    const linkText = match[3];

                    parts.push(
                      <AppText
                        key={`link-${index}-${lastIndex}`}
                        style={styles.linkText}
                        onPress={() => Linking.openURL(url)}
                        text={linkText}
                      />,
                    );
                    lastIndex = linkRegex.lastIndex;
                  }

                  if (lastIndex < formattedText.length) {
                    parts.push(formattedText.substring(lastIndex));
                  }

                  return (
                    <AppText
                      key={index}
                      style={styles.contentText}
                      text={parts.length > 0 ? undefined : formattedText}
                    >
                      {parts.length > 0 ? parts : null}
                    </AppText>
                  );
                })
              )}
            </View>

            {closable && (
              <HoverAndPressedButton
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Icon name="Cancel01Icon" size={18} color={icon.color} />
              </HoverAndPressedButton>
            )}
          </>
        )}
      </View>

      {timeout != null && timeout > 0 && (
        <View
          style={styles.progressTrack}
          onLayout={(e) => (trackWidth.value = e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.text },
              progressFillStyle,
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
};

const createStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.bg,
      borderRadius: 25,
      width: "100%",
      overflow: "hidden",
    },
    inner: {
      padding: 16,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    innerCompact: {
      justifyContent: "center",
      alignItems: "center",
      padding: 12,
    },
    iconContainer: {
      marginRight: 12,
      marginTop: 2,
    },
    iconContainerCompact: {
      marginRight: 0,
      marginTop: 0,
    },
    contentContainer: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
      marginBottom: 2,
    },
    contentText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500",
      opacity: 0.9,
    },
    linkText: {
      textDecorationLine: "underline",
      fontWeight: "700",
    },
    closeButton: {
      padding: 4,
      marginLeft: 8,
    },
    progressTrack: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      overflow: "hidden",
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    progressFill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      right: 0,
      opacity: 0.7,
    },
  });
};

export default StatusMessage;
