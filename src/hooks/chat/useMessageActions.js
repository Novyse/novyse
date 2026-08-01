import { useState, useCallback, useEffect } from "react";
import useUserStore from "@/src/context/UserContext";
import useChatStore from "@/src/context/ChatContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import {
  hasPermission,
  PERMISSIONS,
  getEffectiveLevel,
} from "@/src/utils/chat/permissions";

const useMessageActions = ({
  myUUID,
  onSelected,
  onPin,
  onUnpin,
  onReply,
  onCopy,
  onDownload,
  onEdit,
  onCancel,
  onDelete,
  onReaction,
  onForward,
}) => {
  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const chat = useChatStore((state) => state.chats[selectedChatUUID]);

  const myMember = chat?.members?.find((m) => m.uuid === localUserUUID);
  const myRoleIDs = myMember?.roleIDs;
  const myRoles =
    myRoleIDs?.reduce((acc, id) => {
      const role = chat?.roles?.find((r) => r.id === id);
      if (role) acc.push(role);
      return acc;
    }, []) || [];
  const myLevel = getEffectiveLevel(myRoles);
  const canPinPerm = hasPermission(myRoles, PERMISSIONS.PIN_MESSAGE);
  const canDeletePerm = hasPermission(myRoles, PERMISSIONS.DELETE_MESSAGE);
  const [triggeredMessage, setTriggeredMessage] = useState(null);
  const [triggeredMessagePosition, setTriggeredMessagePosition] = useState({
    x: 0,
    y: 0,
  });
  const [isEditedAllowed, setIsEditedAllowed] = useState(false);
  const [isDeletedAllowed, setIsDeletedAllowed] = useState(false);

  useEffect(() => {
    if (triggeredMessage) {
      setIsEditedAllowed(
        onEdit !== null && triggeredMessage.senderUUID === myUUID,
      );

      let targetLevel = 0;
      if (triggeredMessage.senderUUID !== myUUID) {
        const targetMember = chat?.members?.find(
          (m) => m.uuid === triggeredMessage.senderUUID,
        );
        const targetRoleIDs = targetMember?.roleIDs;
        const targetRoles =
          targetRoleIDs?.reduce((acc, id) => {
            const role = chat?.roles?.find((r) => r.id === id);
            if (role) acc.push(role);
            return acc;
          }, []) || [];
        targetLevel = getEffectiveLevel(targetRoles);
      }

      setIsDeletedAllowed(
        onDelete !== null &&
          (triggeredMessage.senderUUID === myUUID ||
            (canDeletePerm && myLevel >= targetLevel)),
      );
    }
  }, [
    triggeredMessage,
    myUUID,
    onEdit,
    onDelete,
    canDeletePerm,
    myLevel,
    chat,
  ]);

  const onAction = useCallback(
    (action, data = {}) => {
      console.log("Action selected:", action);
      const currentMsg = triggeredMessage;
      setTriggeredMessage(null);

      if (!currentMsg) return;

      switch (action) {
        case "Pin":
          onPin?.(currentMsg);
          break;
        case "Unpin":
          onUnpin?.(currentMsg);
          break;
        case "Reply":
          onReply?.(currentMsg);
          break;
        case "QuoteAndReply":
          onReply?.(currentMsg, data.rangeStart, data.rangeEnd);
          break;
        case "Forward":
          onForward?.(currentMsg);
          break;
        case "Copy":
          onCopy?.(currentMsg);
          break;
        case "Copy Selected":
          onCopy?.({ ...currentMsg, content: data.text });
          break;
        case "Download":
          onDownload?.(currentMsg);
          break;
        case "Select":
          onSelected?.(currentMsg);
          break;
        case "Edit":
          onEdit?.(currentMsg);
          break;
        case "Cancel":
        case "Cancel Edit":
          onCancel?.(currentMsg);
          break;
        case "Delete":
          onDelete?.(currentMsg);
          break;
        case "Reaction":
          onReaction?.(currentMsg, data.emoji);
          break;
        default:
          console.warn("Unknown action:", action);
      }
    },
    [
      triggeredMessage,
      onPin,
      onUnpin,
      onReply,
      onCopy,
      onDownload,
      onEdit,
      onCancel,
      onDelete,
      onReaction,
      onForward,
    ],
  );

  const handleClose = useCallback(() => setTriggeredMessage(null), []);

  return {
    triggeredMessage,
    setTriggeredMessage,
    triggeredMessagePosition,
    setTriggeredMessagePosition,
    isEditedAllowed,
    isDeletedAllowed,
    isPinnedAllowed: canPinPerm,
    onAction,
    handleClose,
  };
};

export default useMessageActions;
