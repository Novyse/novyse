import React from "react";
import { View, Pressable, StyleSheet, Dimensions, Modal } from "react-native";
import AppText from "@/src/components/ui/text/AppText";

import { useThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";

import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "@/src/components/layout/BlurredView";
import ReactionMenu from "@/src/components/messages/ActionMenu/ReactionsMenu";
import Platform from "@/src/utils/device/type";

interface ActionMenuItem {
  action: string;
  translationKey: string;
  text?: string;
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
  isPinnedAllowed?: boolean;
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
  isPinnedAllowed,
  isDownloadAllowed,
  isPendingSend,
  pendingEditJobId,
}) => {
  const { theme } = useThemeContext();
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const isMine = message?.senderUUID === localUserUUID;

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

  const styles = createStyle(theme, adjustedX, adjustedY);

  const [selectedText, setSelectedText] = React.useState("");

  React.useEffect(() => {
    if (!visible || typeof window === "undefined" || !message?.id) {
      setSelectedText("");
      return;
    }

    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) return;

    const text = selection.toString().trim();
    const messageElement = document.getElementById(
      `message-text-${message.id}`,
    );

    if (
      text &&
      messageElement &&
      selection.anchorNode &&
      messageElement.contains(selection.anchorNode)
    ) {
      setSelectedText(selection.toString());
      const range = selection.getRangeAt(0).cloneRange();

      // Modal traps focus and clears selection on mount. We restore it shortly after.
      const timer = setTimeout(() => {
        const currentSel = window.getSelection?.();
        if (currentSel) {
          currentSel.removeAllRanges();
          currentSel.addRange(range);
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [visible, message?.id]);

  let items: ActionMenuItem[] = [];

  if (isPendingSend) {
    items = [
      {
        action: "Cancel",
        translationKey: "chat.messageActions.cancel",
        iconName: "Cancel01Icon",
        color: theme.dangerText,
      },
      isEditedAllowed
        ? {
            action: "Edit",
            translationKey: "chat.messageActions.edit",
            iconName: "PencilEdit02Icon",
            color: theme.text,
          }
        : undefined,
    ].filter((item): item is ActionMenuItem => item !== undefined);
  } else {
    items = (
      [
        {
          action: "Reply",
          translationKey: "chat.messageActions.reply",
          iconName: "ArrowMoveUpLeftIcon",
          color: theme.text,
        },
        selectedText
          ? {
              action: "QuoteAndReply",
              translationKey: "chat.messageActions.quoteAndReply",
              iconName: "ArrowMoveUpLeftIcon",
              color: theme.text,
            }
          : undefined,
        isPinnedAllowed
          ? !isPinned
            ? {
                action: "Pin",
                translationKey: "chat.messageActions.pin",
                iconName: "PinIcon",
                color: theme.text,
              }
            : {
                action: "Unpin",
                translationKey: "chat.messageActions.unpin",
                iconName: "PinOffIcon",
                color: theme.text,
              }
          : undefined,
        {
          action: "Copy",
          translationKey: "chat.messageActions.copy",
          iconName: "Copy02Icon",
          color: theme.text,
        },
        selectedText
          ? {
              action: "Copy Selected",
              translationKey: "chat.messageActions.copySelected",
              iconName: "Copy01Icon",
              color: theme.text,
            }
          : undefined,
        isDownloadAllowed
          ? {
              action: "Download",
              translationKey: "chat.messageActions.download",
              iconName: "Download01Icon",
              color: theme.text,
            }
          : undefined,
        pendingEditJobId
          ? {
              action: "Cancel Edit",
              translationKey: "chat.messageActions.cancelEdit",
              iconName: "Cancel01Icon",
              color: theme.dangerText,
            }
          : isEditedAllowed
            ? {
                action: "Edit",
                translationKey: "chat.messageActions.edit",
                iconName: "PencilEdit02Icon",
                color: theme.text,
              }
            : undefined,
        {
          action: "Forward",
          translationKey: "chat.messageActions.forward",
          iconName: "LinkForwardIcon",
          color: theme.text,
        },
        {
          action: "Select",
          translationKey: "chat.messageActions.select",
          iconName: "CheckmarkCircle02Icon",
          color: theme.text,
        },
        isDeletedAllowed
          ? {
              action: "Delete",
              translationKey: "chat.messageActions.delete",
              iconName: "Delete02Icon",
              color: theme.dangerText,
            }
          : undefined,
      ] as (ActionMenuItem | undefined)[]
    ).filter((item): item is ActionMenuItem => item !== undefined);
  }

  const handleMenuItemPress = (action: string) => {
    if (action === "Copy Selected") {
      onAction(action, { text: selectedText });
    } else if (action === "QuoteAndReply") {
      let rangeStart = undefined;
      let rangeEnd = undefined;
      if (selectedText && message?.content) {
        const textToFind = selectedText.trim();
        const start = message.content.indexOf(textToFind);
        if (start !== -1) {
          rangeStart = start;
          rangeEnd = start + textToFind.length;
        }
      }
      onAction(action, { rangeStart, rangeEnd });
    } else {
      onAction(action);
    }
    onClose();
  };

  const handleReactionPress = (emoji: string) => {
    const data = { emoji };
    onAction("Reaction", data);
    onClose();
  };

  const readsArray = message?.readBy || [];
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
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        // @ts-ignore
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={styles.overlay}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.wrapper]}
        >
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
                    <AppText
                      style={styles.menuText}
                      numberOfLines={1}
                      translationKey={item.translationKey}
                      text={item.text}
                    />
                  </View>
                </HoverAndPressedButton>
              ))}
            </View>
          </BlurredView>
          {/* Stats Box (Reads & Reactions) */}
          {isMine && ((!isPendingSend && hasRead) || hasReactions) ? (
            <View style={styles.statsContainerParent}>
              {!isPendingSend && hasRead && (
                <BlurredView style={styles.statsContainerHalf}>
                  <HoverAndPressedButton
                    onPress={() => {}}
                    style={styles.statsButtonHalf}
                  >
                    <View style={styles.statsRowHalf}>
                      <Icon name="EyeIcon" size={16} color={theme.text} />
                      <AppText
                        style={styles.statsTextHalf}
                        text={readCount.toString()}
                      />
                    </View>
                  </HoverAndPressedButton>
                </BlurredView>
              )}
              {hasReactions && (
                <BlurredView style={styles.statsContainerHalf}>
                  <HoverAndPressedButton
                    onPress={() => {}}
                    style={styles.statsButtonHalf}
                  >
                    <View style={styles.statsRowHalf}>
                      <Icon name="SmileIcon" size={16} color={theme.text} />
                      <AppText
                        style={styles.statsTextHalf}
                        text={totalReactions.toString()}
                      />
                    </View>
                  </HoverAndPressedButton>
                </BlurredView>
              )}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ActionMenu;

const createStyle = (theme: any, adjustedX: number, adjustedY: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
    },
    wrapper: {
      position: "absolute",
      zIndex: 1000,
      maxWidth: 175,
      top: adjustedY,
      left: adjustedX,
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
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 0,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    menuText: {
      fontSize: 14,
      color: theme.text,
    },
    statsContainerParent: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      gap: 8,
      minWidth: 120,
      maxWidth: 175,
    },
    statsContainerHalf: {
      flex: 1,
      borderRadius: 10,
      overflow: "hidden",
    },
    statsButtonHalf: {
      paddingVertical: 5,
      paddingHorizontal: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    statsRowHalf: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    statsTextHalf: {
      fontSize: 14,
      color: theme.text,
      flexShrink: 1,
    },
  });
