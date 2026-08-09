import React, { useContext } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

interface SecurityListCardProps {
  iconName: string;
  title: string;
  subtitle?: string | React.ReactNode;
  badge?: string;
  isHighlighted?: boolean;
  active?: boolean;
  onToggle?: (active: boolean) => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}

const SecurityListCard = ({
  iconName,
  title,
  subtitle,
  badge,
  isHighlighted = false,
  active = true,
  onToggle,
  onDelete,
  children,
}: SecurityListCardProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const iconBgColor = active
    ? isHighlighted
      ? theme.iconSuccess
      : theme.primary
    : theme.subtitle;

  const badgeBgColor = active ? theme.iconSuccess : theme.subtitle;

  return (
    <View
      style={[
        styles.card,
        isHighlighted && { borderColor: theme.iconSuccess },
        !active && { opacity: 0.6 },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <View
            style={[styles.iconContainer, { backgroundColor: iconBgColor }]}
          >
            <Icon name={iconName} />
          </View>
          <View style={styles.details}>
            <Typography variant={active ? "default" : "subtitle"} text={title} />
            {subtitle &&
              (typeof subtitle === "string" ? (
                <Typography variant="subtitle" text={subtitle} />
              ) : (
                subtitle
              ))}
          </View>
        </View>

        <View style={styles.actions}>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
              <Typography variant="subtitle" text={badge} />
            </View>
          )}
          {onToggle && (
            <Pressable
              onPress={() => onToggle(!active)}
              style={({ pressed, hovered }: any) => [
                styles.toggleButton,
                hovered && styles.toggleButtonHovered,
                pressed && styles.toggleButtonPressed,
                !active && { backgroundColor: theme.iconSuccess },
              ]}
            >
              <Icon name={active ? "ViewOffIcon" : "ViewIcon"} size={20} />
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
              <Icon name="Delete02Icon" />
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
      backgroundColor: theme.backgroundMain,
      borderRadius: 16,
      marginBottom: 16,
      padding: 20,
      elevation: 2,
      shadowColor: theme.shadowColor,
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
    deleteButton: {
      backgroundColor: theme.iconDanger,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButtonHovered: {
      backgroundColor: theme.iconDanger,
      opacity: 0.8,
      cursor: "pointer" as any,
    },
    deleteButtonPressed: {
      backgroundColor: theme.iconDanger,
      opacity: 0.6,
    },
    toggleButton: {
      backgroundColor: theme.subtitle,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    toggleButtonHovered: {
      backgroundColor: theme.subtitle,
      opacity: 0.8,
      cursor: "pointer" as any,
    },
    toggleButtonPressed: {
      backgroundColor: theme.subtitle,
      opacity: 0.6,
    },
    childrenContainer: {
      marginTop: 16,
    },
  });

export default SecurityListCard;
