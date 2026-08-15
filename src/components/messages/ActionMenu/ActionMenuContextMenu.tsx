import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";

import { useThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/store/UserStore";

import Icon from "@/src/components/ui/icon/Icon";
import Typography from "@/src/components/ui/typography/Typography";
import BlurredView from "@/src/components/layout/BlurredView";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import ContextMenu from "@/src/components/features/contextMenu/ContextMenu";
import ContextMenuItem from "@/src/components/features/contextMenu/ContextMenuItem";
import ReactionMenu from "@/src/components/messages/ActionMenu/ReactionsMenu";

const MENU_WIDTH = 175;

interface ActionMenuContextMenuItem {
  action: string;
  translationKey: string;
  iconName: string;
  variant?: "default" | "danger";
}

interface ActionMenuContextMenuProps {
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

const ActionMenuContextMenu: React.FC<ActionMenuContextMenuProps> = ({
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
  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const isMine = message?.senderUUID === localUserUUID;

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

  const items: ActionMenuContextMenuItem[] = useMemo(() => {
    if (isPendingSend) {
      return [
        {
          action: "Cancel",
          translationKey: "chat.messageActions.cancel",
          iconName: "Cancel01Icon",
          variant: "danger" as const,
        },
        isEditedAllowed
          ? {
              action: "Edit",
              translationKey: "chat.messageActions.edit",
              iconName: "Pen01Icon",
            }
          : undefined,
      ].filter((item): item is ActionMenuContextMenuItem => item !== undefined);
    }

    return (
      [
        {
          action: "Reply",
          translationKey: "chat.messageActions.reply",
          iconName: "ArrowMoveUpLeftIcon",
        },
        selectedText
          ? {
              action: "QuoteAndReply",
              translationKey: "chat.messageActions.quoteAndReply",
              iconName: "ArrowMoveUpLeftIcon",
            }
          : undefined,
        isPinnedAllowed
          ? !isPinned
            ? {
                action: "Pin",
                translationKey: "chat.messageActions.pin",
                iconName: "PinIcon",
              }
            : {
                action: "Unpin",
                translationKey: "chat.messageActions.unpin",
                iconName: "PinOffIcon",
              }
          : undefined,
        {
          action: "Copy",
          translationKey: "chat.messageActions.copy",
          iconName: "Copy01Icon",
        },
        selectedText
          ? {
              action: "Copy Selected",
              translationKey: "chat.messageActions.copySelected",
              iconName: "Copy01Icon",
            }
          : undefined,
        isDownloadAllowed
          ? {
              action: "Download",
              translationKey: "chat.messageActions.download",
              iconName: "Download01Icon",
            }
          : undefined,
        pendingEditJobId
          ? {
              action: "Cancel Edit",
              translationKey: "chat.messageActions.cancelEdit",
              iconName: "Cancel01Icon",
              variant: "danger" as const,
            }
          : isEditedAllowed
            ? {
                action: "Edit",
                translationKey: "chat.messageActions.edit",
                iconName: "Pen01Icon",
              }
            : undefined,
        {
          action: "Forward",
          translationKey: "chat.messageActions.forward",
          iconName: "LinkForwardIcon",
        },
        {
          action: "Select",
          translationKey: "chat.messageActions.select",
          iconName: "CheckmarkCircle02Icon",
        },
        isDeletedAllowed
          ? {
              action: "Delete",
              translationKey: "chat.messageActions.delete",
              iconName: "Delete02Icon",
              variant: "danger" as const,
            }
          : undefined,
      ] as (ActionMenuContextMenuItem | undefined)[]
    ).filter((item): item is ActionMenuContextMenuItem => item !== undefined);
  }, [
    isPendingSend,
    isEditedAllowed,
    selectedText,
    isPinnedAllowed,
    isPinned,
    isDownloadAllowed,
    pendingEditJobId,
    isDeletedAllowed,
  ]);

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
    onAction("Reaction", { emoji });
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
  const showStats =
    isMine && ((!isPendingSend && hasRead) || hasReactions);

  const estimatedHeight =
    (isPendingSend ? 0 : 52) + items.length * 44 + (showStats ? 44 : 0);

  return (
    <ContextMenu
      visible={visible}
      onClose={onClose}
      position={position}
      width={MENU_WIDTH}
      estimatedHeight={estimatedHeight}
      header={
        !isPendingSend ? (
          <ReactionMenu onReaction={handleReactionPress} />
        ) : null
      }
      footer={
        showStats ? (
          <View style={styles.statsContainerParent}>
            {!isPendingSend && hasRead && (
              <BlurredView style={styles.statsContainerHalf}>
                <HoverAndPressedButton
                  onPress={() => {}}
                  style={styles.statsButtonHalf}
                >
                  <View style={styles.statsRowHalf}>
                    <Icon name="EyeIcon" size={16} color={theme.text} />
                    <Typography
                      size="sm"
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
                    <Typography
                      size="sm"
                      text={totalReactions.toString()}
                    />
                  </View>
                </HoverAndPressedButton>
              </BlurredView>
            )}
          </View>
        ) : null
      }
    >
      {items.map((item) => (
        <ContextMenuItem
          key={item.action}
          iconName={item.iconName}
          translationKey={item.translationKey}
          variant={item.variant}
          iconColor={item.variant === "danger" ? theme.dangerText : undefined}
          onPress={() => handleMenuItemPress(item.action)}
        />
      ))}
    </ContextMenu>
  );
};

export default ActionMenuContextMenu;

const styles = StyleSheet.create({
  statsContainerParent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  statsContainerHalf: {
    flex: 1,
    borderRadius: 25,
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
});
