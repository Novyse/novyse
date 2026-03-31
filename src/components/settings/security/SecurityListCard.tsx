import React, { useContext } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";

interface SecurityListCardProps {
  iconName: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  isHighlighted?: boolean;
  active?: boolean;
  onToggle?: (active: boolean) => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}

const SecurityListCard = ({
  iconName,
  iconColor = "#6366f1",
  title,
  subtitle,
  badge,
  badgeColor = "#00C851",
  isHighlighted = false,
  active = true,
  onToggle,
  onDelete,
  children,
}: SecurityListCardProps) => {

  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={[
      styles.card, 
      isHighlighted && { borderColor: badgeColor },
      !active && { opacity: 0.6 }
    ]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: active ? iconColor : "#a0a0a0" }
          ]}>
            <Icon name={iconName} color="#fff" />
          </View>
          <View style={styles.details}>
            <Text style={[styles.title, !active && { color: "#a0a0a0" }]}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        <View style={styles.actions}>
          {badge && (
            <View style={[styles.badge, { backgroundColor: active ? badgeColor : "#a0a0a0" }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          {onToggle && (
            <Pressable
              onPress={() => onToggle(!active)}
              style={({ pressed, hovered }: any) => [
                styles.toggleButton,
                hovered && styles.toggleButtonHovered,
                pressed && styles.toggleButtonPressed,
                !active && { backgroundColor: "#00C851" } // Green to re-enable
              ]}
            >
              <Icon 
                name={active ? "ViewOffIcon" : "ViewIcon"} 
                color="#fff" 
                size={20}
              />
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={onDelete}
              style={({ pressed, hovered }: any) => [
                styles.deleteButton,
                hovered && styles.deleteButtonHovered,
                pressed && styles.deleteButtonPressed,
              ]}
            >
              <Icon name="Delete02Icon" color="#fff" />
            </Pressable>
          )}
        </View>
      </View>

      {children && <View style={styles.childrenContainer}>{children}</View>}
    </View>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.backgroundSettingsCards,
      borderRadius: 16,
      marginBottom: 16,
      padding: 20,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    info: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    details: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: "#a0a0a0",
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    badgeText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    deleteButton: {
      backgroundColor: "#FF4757",
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButtonHovered: {
      backgroundColor: "#e8414f",
      cursor: "pointer" as any,
    },
    deleteButtonPressed: {
      backgroundColor: "#d13a47",
      opacity: 0.9,
    },
    toggleButton: {
      backgroundColor: "#a0a0a0",
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    toggleButtonHovered: {
      backgroundColor: "#909090",
      cursor: "pointer" as any,
    },
    toggleButtonPressed: {
      backgroundColor: "#808080",
      opacity: 0.9,
    },
    childrenContainer: {

      marginTop: 16,
    },
  });

export default SecurityListCard;
