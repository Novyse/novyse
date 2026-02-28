import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

import HoverAndPressedButton from "./HoverAndPressedButton";
import Icon from "@/src/components/Icon";

type StatusMessageType = "success" | "error" | "warning" | "info";

interface StatusMessageProps {
  type: StatusMessageType;
  visible?: boolean;
  content?: string[];
  timeout?: number | null;
  onClose?: () => void;
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
  timeout = null,
  onClose,
}: StatusMessageProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(visible);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 10,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      if (onClose) onClose();
    });
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (timeout) {
        timer = setTimeout(() => {
          handleClose();
        }, timeout);
      }
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(10);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, timeout]);

  if (!isVisible) return null;

  const getTypeValues = (): TypeValues => {
    switch (type) {
      case "success":
        return {
          title: "Success",
          icon: { name: "CheckmarkCircle02Icon", color: "#FFFFFF" },
          theme: { bg: "#48cd79ab", text: "#FFFFFF" },
        };
      case "error":
        return {
          title: "Error",
          icon: { name: "AlertCircleIcon", color: "#FFFFFF" },
          theme: { bg: "#9c4238ab", text: "#FFFFFF" },
        };
      case "warning":
        return {
          title: "Warning",
          icon: { name: "Alert02Icon", color: "#000000" },
          theme: { bg: "#f0ce46c1", text: "#000000" },
        };
      case "info":
      default:
        return {
          title: "Info",
          icon: { name: "InformationCircleIcon", color: "#FFFFFF" },
          theme: { bg: "#297fb9d2", text: "#FFFFFF" },
        };
    }
  };

  const { title, icon, theme: colors } = getTypeValues();
  const styles = createStyles(colors);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.iconContainer}>
          <Icon name={icon.name} size={20} color={icon.color} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{title}</Text>
          {content.map((value, index) => (
            <Text key={index} style={styles.contentText}>
              {content.length > 1 ? `• ${value}` : value}
            </Text>
          ))}
        </View>

        <HoverAndPressedButton onPress={handleClose} style={styles.closeButton}>
          <Icon name="Cancel01Icon" size={18} color={icon.color} />
        </HoverAndPressedButton>
      </View>
    </Animated.View>
  );
};

const createStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      marginTop: 12,
      width: "100%",
      overflow: "hidden",
    },
    inner: {
      padding: 16,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    iconContainer: {
      marginRight: 12,
      marginTop: 2,
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
    closeButton: {
      padding: 4,
      marginLeft: 8,
    },
  });
};

export default StatusMessage;