import { router } from "expo-router";

interface ChatShortcutsActions {
  editingMessage?: any;
  replyingTo?: any[];
  onCancelEdit?: () => void;
  onCancelReply?: (id: string) => void;
  onPressArrowUp?: () => void;
  isInputEmpty?: boolean;
}

// Secondo me sarebbe meglio disabilitare tutte le shortcut, poi abilitiamo solo le necessarie.

export const handleChatShortcuts = (e: any, actions: ChatShortcutsActions) => {
  const key = e.key || e.nativeEvent?.key;

  if (key === "Escape") {
    if (actions.editingMessage) {
      actions.onCancelEdit?.();
    } else if (actions.replyingTo && actions.replyingTo.length > 0) {
      actions.onCancelReply?.(actions.replyingTo[0].id);
    } else {
      router.push("/app");
    }
  } else if (key === "ArrowUp") {
    if (actions.isInputEmpty) {
      actions.onPressArrowUp?.();
    }
  }
};
