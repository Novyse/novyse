import React from "react";
import {
  View,
  TouchableWithoutFeedback,
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
  onClose: () => void;
  onAction: (action: string) => void;
  onReaction: (emoji: string) => void;
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
  onClose,
  onAction,
  onReaction,
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
    onReaction(emoji);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayTouchable} />
        </TouchableWithoutFeedback>

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
        </View>
      </View>
    </Modal>
  );
};

export default ActionMenu;

const createStyle = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
    },
    overlayTouchable: {
      ...StyleSheet.absoluteFillObject,
    },
    wrapper: {
      position: "absolute",
      zIndex: 1000,
      maxWidth: 175,
    },
    menuContainer: {
      borderRadius: 10,
      padding: 10,
      minWidth: 120,
      maxWidth: 175,
      zIndex: 1000,
    },
    menuColumn: {
      flexDirection: "column",
    },
    menuItem: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    menuText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.text,
    },
  });
