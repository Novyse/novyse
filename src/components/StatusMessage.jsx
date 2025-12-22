import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

import HoverAndPressedButton from "./HoverAndPressedButton";
import BlurredView from "./BlurredView";
import Icon from "@/src/components/Icon";

const StatusMessage = ({
  type,
  visible = true,
  content = [],
  onClose,
  theme,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
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
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [visible]);

  if (!visible) return null;

  const getTypeValues = () => {
    switch (type) {
      case "success":
        return {
          title: "Success",
          iconName: "CheckmarkCircle02Icon",
          icon: {
            name: "CheckmarkCircle02Icon",
            color: "#4BB543",
            cancelColor: "#66C466",
          },
          theme: {
            containerBg: "rgba(75, 181, 67, 0.1)",
            shadowColor: "#4BB543",
            iconBg: "rgba(75, 181, 67, 0.15)",
            titleColor: "#ffffff",
            bulletColor: "#66C466",
            contentColor: "#B3E5B3",
          },
        };
      case "error":
        return {
          title: "Error",
          icon: {
            name: "AlertCircleIcon",
            color: "#FF6B6B",
            cancelColor: "#FF8F8F",
          },
          theme: {
            containerBg: "rgba(40, 10, 14, 0.95)",
            shadowColor: "#FF453A",
            iconBg: "rgba(255, 99, 99, 0.15)",
            titleColor: "#ffffff",
            bulletColor: "#FF8F8F",
            contentColor: "#FFD1D1",
          },
        };
      case "warning":
        return {
          title: "Warning",
          icon: {
            name: "Alert02Icon",
            color: "#FFA500",
            cancelColor: "#FFB733",
          },
          theme: {
            containerBg: "rgba(255, 166, 0, 0.1)",
            shadowColor: "#FFA500",
            iconBg: "rgba(255, 166, 0, 0.15)",
            titleColor: "#ffffff",
            bulletColor: "#FFB733",
            contentColor: "#FFE5B3",
          },
        };
      case "info":
      default:
        return {
          title: "Info",
          icon: {
            name: "InformationCircleIcon",
            color: "#ffffff",
            cancelColor: "#3399FF",
          },
          theme: {
            containerBg: "rgba(0, 120, 255, 0.1)",
            shadowColor: "#0078FF",
            iconBg: "rgba(0, 120, 255, 0.15)",
            titleColor: "#ffffff",
            bulletColor: "#3399FF",
            contentColor: "#B3D9FF",
          },
        };
    }
  };

  const typeValues = getTypeValues();

  const styles = createStyles(typeValues.theme);

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
      <BlurredView style={styles.blurredContainer} intensity={60}>
        {/* ! Icon */}
        <View style={styles.iconContainer}>
          <Icon
            name={typeValues.icon.name}
            size={20}
            color={typeValues.icon.color}
          />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{typeValues.title}</Text>
          <View style={styles.contentList}>
            {content.map((value, index) => (
              <View key={index} style={styles.contentItem}>
                {content.length > 1 && <View style={styles.bulletPoint} />}
                <Text style={styles.contentText}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Close toast btn */}
        <HoverAndPressedButton onPress={onClose} style={styles.closeButton}>
          <Icon
            name="Cancel01Icon"
            size={18}
            color={typeValues.icon.cancelColor}
          />
        </HoverAndPressedButton>
      </BlurredView>
    </Animated.View>
  );
};

const createStyles = (theme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.containerBg,
      borderRadius: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
      margin: 16,
      width: "100%",
    },
    blurredContainer: {
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.iconBg,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    contentContainer: {
      flex: 1,
      paddingRight: 8,
    },
    title: {
      color: theme.titleColor,
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 6,
    },
    contentList: {
      gap: 4,
    },
    contentItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 2,
    },
    bulletPoint: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.bulletColor,
      marginRight: 8,
    },
    contentText: {
      color: theme.contentColor,
      fontSize: 13,
      fontWeight: "400",
    },
    closeButton: {
      padding: 4,
    },
  });
};

export default StatusMessage;
