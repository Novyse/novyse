import { useState, useCallback, useEffect } from "react";

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
      setIsDeletedAllowed(
        onDelete !== null && triggeredMessage.senderUUID === myUUID,
      );
    }
  }, [triggeredMessage, myUUID, onEdit, onDelete]);

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
        case "Forward":
          onForward?.(currentMsg);
          break;
        case "Copy":
          onCopy?.(currentMsg);
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
    onAction,
    handleClose,
  };
};

export default useMessageActions;
