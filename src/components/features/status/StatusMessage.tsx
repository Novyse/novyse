import { useEffect, useState, useContext } from "react";
import { View, StyleSheet, Linking } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInUp,
  FadeOutDown,
} from "react-native-reanimated";

import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import Typography from "@/src/components/ui/typography/Typography";
import BlurredView from "@/src/components/layout/BlurredView";
import { ThemeContext } from "@/src/context/ThemeContext";

type StatusMessageType = "success" | "danger" | "warning" | "info";

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
  const progress = useSharedValue(1);
  const trackWidth = useSharedValue(0);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 200);
  };

  useEffect(() => {
    if (!isVisible) {
      progress.value = 1;
      return;
    }
    if (timeout) {
      progress.value = 1;
      progress.value = withTiming(0, { duration: timeout });
      const t = setTimeout(handleClose, timeout);
      return () => clearTimeout(t);
    }
  }, [isVisible, timeout]);

  const progressFillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -trackWidth.value / 2 },
      { scaleX: progress.value },
      { translateX: trackWidth.value / 2 },
    ],
  }));

  const getTypeValues = (): TypeValues => {
    switch (type) {
      case "success":
        return {
          icon: { name: "CheckmarkCircle02Icon", color: theme.successText },
          theme: { bg: theme.backgroundSuccess, text: theme.successText },
        };
      case "danger":
        return {
          icon: { name: "AlertCircleIcon", color: theme.dangerText },
          theme: { bg: theme.backgroundDanger, text: theme.dangerText },
        };
      case "warning":
        return {
          icon: { name: "Alert02Icon", color: theme.warningText },
          theme: { bg: theme.backgroundWarning, text: theme.warningText },
        };
      case "info":
      default:
        return {
          icon: { name: "InformationCircleIcon", color: theme.infoText },
          theme: { bg: theme.backgroundInfo, text: theme.infoText },
        };
    }
  };

  const { icon, theme: colors } = getTypeValues();
  const list = Array.isArray(content) ? content : [];

  return (
    <>
      {isVisible && (
        <Animated.View
          entering={FadeInUp.duration(300)}
          exiting={FadeOutDown.duration(200)}
          style={styles.container}
        >
          <BlurredView
            color={colors.bg}
            style={styles.blur}
          >
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
                    <Typography
                      size="sm"
                      weight="bold"
                      variant={type}
                      translationKey={`common.status.${type}`}
                    />
                    {translationKey ? (
                      <Typography
                        size="xs"
                        weight="medium"
                        variant={type}
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
                            <Typography
                              key={`link-${index}-${lastIndex}`}
                              size="xs"
                              weight="bold"
                              variant={type}
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
                          <Typography
                            key={index}
                            size="xs"
                            weight="medium"
                            variant={type}
                            text={parts.length > 0 ? undefined : formattedText}
                          >
                            {parts.length > 0 ? parts : null}
                          </Typography>
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
                onLayout={(e) =>
                  (trackWidth.value = e.nativeEvent.layout.width)
                }
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
          </BlurredView>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  blur: {
    width: "100%",
    borderRadius: 25,
  },
  inner: {
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 25,
  },
  innerCompact: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  iconContainer: {
    marginRight: 10,
  },
  iconContainerCompact: {
    marginRight: 0,
    marginTop: 0,
  },
  contentContainer: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
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

export default StatusMessage;
