import React from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";

import { useThemeContext } from "@/context/ThemeContext";
import HoverAndPressedButton from "../../HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import BlurredView from "../../BlurredView";
import ReactionMenu from "./ReactionsMenu";

interface ActionMenuItem {
  action: string;
  iconName: string;
  color: string;
}

interface ActionMenuProps {
  visible: boolean;
  message?: any;
  onClose: () => void;
  onAction: (action: string, data?: Object) => void;
  position: { x: number; y: number };
  isPinned: boolean;
  isEditedAllowed: boolean;
  isDeletedAllowed: boolean;
  isDownloadAllowed: boolean;
  isPendingSend?: boolean;
  pendingEditJobId?: string | null;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  visible,
  message,
  onClose,
  onAction,
  position,
  isPinned,
  isEditedAllowed,
  isDeletedAllowed,
  isDownloadAllowed,
  isPendingSend,
  pendingEditJobId,
}) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const menuWidth = 200;
  const menuHeight = 350;

  let adjustedX = position.x;
  let adjustedY = position.y;

  if (position.x + menuWidth > screenWidth) {
    adjustedX = screenWidth - menuWidth - 10;
  }
  if (adjustedX < 10) {
    adjustedX = 10;
  }

  if (position.y + menuHeight > screenHeight) {
    adjustedY = position.y - menuHeight;
    if (adjustedY < 10) {
      adjustedY = 10;
    }
  }

  let items: ActionMenuItem[] = [];

  if (isPendingSend) {
    items = [
      { action: "Cancel", iconName: "Cancel01Icon", color: "red" },
      isEditedAllowed
        ? { action: "Edit", iconName: "PencilEdit02Icon", color: theme.text }
        : undefined,
    ].filter((item): item is ActionMenuItem => item !== undefined);
  } else {
    items = (
      [
        { action: "Reply", iconName: "ArrowMoveUpLeftIcon", color: theme.text },
        !isPinned
          ? { action: "Pin", iconName: "PinIcon", color: theme.text }
          : { action: "Unpin", iconName: "PinOffIcon", color: theme.text },
        { action: "Copy", iconName: "Copy02Icon", color: theme.text },
        isDownloadAllowed
          ? {
              action: "Download",
              iconName: "Download01Icon",
              color: theme.text,
            }
          : undefined,
        pendingEditJobId
          ? { action: "Cancel Edit", iconName: "Cancel01Icon", color: "red" }
          : isEditedAllowed
            ? {
                action: "Edit",
                iconName: "PencilEdit02Icon",
                color: theme.text,
              }
            : undefined,
        { action: "Forward", iconName: "LinkForwardIcon", color: theme.text },
        {
          action: "Select",
          iconName: "CheckmarkCircle02Icon",
          color: theme.text,
        },
        isDeletedAllowed
          ? { action: "Delete", iconName: "Delete02Icon", color: "red" }
          : undefined,
      ] as (ActionMenuItem | undefined)[]
    ).filter((item): item is ActionMenuItem => item !== undefined);
  }

  const handleMenuItemPress = (action: string) => {
    onAction(action);
    onClose();
  };

  const handleReactionPress = (emoji: string) => {
    const data = { emoji };
    onAction("Reaction", data);
    onClose();
  };

  const readsArray = message?.reads || [];
  const readCount = readsArray.length;
  const hasRead = readCount > 0;

  const reactionsArray = message?.reactions || [];
  const totalReactions = reactionsArray.reduce(
    (acc: number, r: any) => acc + (r.userUUIDs?.length || 0),
    0,
  );
  const hasReactions = totalReactions > 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={styles.overlay}
      >
        <View style={[styles.wrapper, { top: adjustedY, left: adjustedX }]}>
          {!isPendingSend && <ReactionMenu onReaction={handleReactionPress} />}

          <BlurredView style={styles.menuContainer}>
            <View style={styles.menuColumn}>
              {items.map((item) => (
                <HoverAndPressedButton
                  key={item.action}
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(item.action)}
                >
                  <View style={styles.menuItemContent}>
                    <Icon name={item.iconName} size={20} color={item.color} />
                    <Text style={styles.menuText} numberOfLines={1}>
                      {item.action}
                    </Text>
                  </View>
                </HoverAndPressedButton>
              ))}
            </View>
          </BlurredView>
          {/* Read & Reactions Box */}
          {hasRead ||
            (hasReactions && (
              <View style={{ marginTop: 8 }}>
                <BlurredView style={styles.statsContainer}>
                  <HoverAndPressedButton
                    onPress={() => {}}
                    style={styles.statsButton}
                  >
                    {hasRead && (
                      <View style={styles.statsRow}>
                        <Icon name="EyeIcon" size={16} color={theme.text} />
                        <Text
                          style={styles.statsText}
                        >{`${readCount} Reads.`}</Text>
                      </View>
                    )}
                    {hasReactions && (
                      <View style={styles.statsRow}>
                        <Icon name="SmileIcon" size={16} color={theme.text} />
                        <Text style={styles.statsText}>
                          {`${totalReactions} Reactions.`}
                        </Text>
                      </View>
                    )}
                  </HoverAndPressedButton>
                </BlurredView>
              </View>
            ))}
        </View>
      </Pressable>
    </Modal>
  );
};

export default ActionMenu;

const createStyle = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
    },
    wrapper: {
      position: "absolute",
      zIndex: 1000,
      maxWidth: 175,
    },
    menuContainer: {
      borderRadius: 10,
      padding: 0,
      minWidth: 120,
      maxWidth: 175,
      zIndex: 1000,
    },
    menuColumn: {
      flexDirection: "column",
    },
    menuItem: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 0,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    menuText: {
      fontSize: 14,
      color: theme.text,
    },
    statsContainer: {
      borderRadius: 10,
      minWidth: 120,
      maxWidth: 175,
      zIndex: 1000,
      overflow: "hidden",
    },
    statsButton: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      flexDirection: "column",
      gap: 8,
      borderRadius: 0,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    statsText: {
      fontSize: 14,
      color: theme.text,
      flexShrink: 1,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    detailsModalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "80%",
    },
    detailsModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    detailsModalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
    },
    detailsScrollView: {
      flexGrow: 1,
    },
    detailsSectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 8,
    },
    detailsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    detailsText: {
      fontSize: 14,
      color: theme.text,
    },
    detailsEmptyText: {
      fontSize: 14,
      color: theme.text,
      fontStyle: "italic",
      opacity: 0.7,
      marginBottom: 8,
    },
    detailsDivider: {
      height: 1,
      backgroundColor: theme.border || "rgba(255,255,255,0.1)",
      marginVertical: 16,
    },
    reactionGroup: {
      marginBottom: 12,
    },
    reactionGroupTitle: {
      fontSize: 18,
      marginBottom: 4,
    },
  });
