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

interface ActionMenuItem {
  action: string;
  iconName: string;
  color: string;
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
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

  const menuWidth = 180;
  const menuHeight = 300;

  let adjustedX = position.x;
  let adjustedY = position.y;

  // Adjust X
  if (position.x + menuWidth > screenWidth) {
    adjustedX = screenWidth - menuWidth;
  }
  if (adjustedX < 0) {
    adjustedX = 0;
  }

  // Adjust Y: prefer below, if not possible, above
  if (position.y + menuHeight > screenHeight) {
    adjustedY = position.y - menuHeight;
    if (adjustedY < 0) {
      adjustedY = 0;
    }
  }

  let items: ActionMenuItem[] = [];

  if (isPendingSend) {
    items = [
      {
        action: "Cancel",
        iconName: "Cancel01Icon",
        color: "red",
      },
    ];
  } else {
    items = (
      [
        {
          action: "Reply",
          iconName: "ArrowMoveUpLeftIcon",
          color: theme.text,
        },
        !isPinned
          ? {
            action: "Pin",
            iconName: "PinIcon",
            color: theme.text,
          }
          : undefined,
        isPinned
          ? {
            action: "Unpin",
            iconName: "PinOffIcon",
            color: theme.text,
          }
          : undefined,
        {
          action: "Copy",
          iconName: "Copy02Icon",
          color: theme.text,
        },
        isDownloadAllowed
          ? {
            action: "Download",
            iconName: "Download01Icon",
            color: theme.text,
          }
          : undefined,
        pendingEditJobId
          ? {
            action: "Cancel Edit",
            iconName: "Cancel01Icon",
            color: "red",
          }
          : isEditedAllowed
            ? {
              action: "Edit",
              iconName: "PencilEdit02Icon",
              color: theme.text,
            }
            : undefined,
        {
          action: "Forward",
          iconName: "LinkForwardIcon",
          color: theme.text,
        },
        {
          action: "Select",
          iconName: "CheckmarkCircle02Icon",
          color: theme.text,
        },
        isDeletedAllowed
          ? {
            action: "Delete",
            iconName: "Delete02Icon",
            color: "red",
          }
          : undefined,
      ] as (ActionMenuItem | undefined)[]
    ).filter((item): item is ActionMenuItem => item !== undefined);
  }

  const handleMenuItemPress = (action: string) => {
    onAction(action);
    onClose();
  };

  const renderMenuItem = (item: ActionMenuItem) => (
    <HoverAndPressedButton
      key={item.action}
      style={styles.menuItem}
      onPress={() => handleMenuItemPress(item.action)}
    >
      <View style={styles.menuItemContent}>
        <Icon name={item.iconName} size={20} color={item.color} />
        <Text style={styles.menuText}>{item.action}</Text>
      </View>
    </HoverAndPressedButton>
  );

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayTouchable} />
        </TouchableWithoutFeedback>
        <BlurredView
          style={[
            styles.menuContainer,
            { position: "absolute", top: adjustedY, left: adjustedX },
          ]}
        >
          <View style={styles.menuColumn}>
            {items.map((item) => renderMenuItem(item))}
          </View>
        </BlurredView>
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
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    menuContainer: {
      borderRadius: 10,
      padding: 10,
      minWidth: 120,
      maxWidth: 220,
      zIndex: 1000,
    },
    menuColumn: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    menuItem: {
      alignItems: "flex-start",
      justifyContent: "center",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      width: "100%",
    },
    menuText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.text,
      textAlign: "left",
      flex: 1,
    },
  });
