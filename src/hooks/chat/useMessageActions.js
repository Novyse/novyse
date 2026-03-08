import { useState, useCallback, useEffect } from "react";

const useMessageActions = ({
  myUUID,
  onPin,
  onUnpin,
  onReply,
  onCopy,
  onDownload,
  onEdit,
  onCancel,
  onDelete,
  onReaction,
}) => {
  const [triggeredMessage, setTriggeredMessage] = useState(null);
  const [triggeredMessagePosition, setTriggeredMessagePosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedMessage, setSelectedMessage] = useState([]);
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
          console.log("Forwarding message:", currentMsg);
          break;
        case "Copy":
          onCopy?.(currentMsg);
          break;
        case "Download":
          onDownload?.(currentMsg);
          break;
        case "Select":
          setSelectedMessage((prev) => [...prev, currentMsg]);
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
    ],
  );

  const handleClose = useCallback(() => setTriggeredMessage(null), []);

  return {
    triggeredMessage,
    setTriggeredMessage,
    triggeredMessagePosition,
    setTriggeredMessagePosition,
    selectedMessage,
    setSelectedMessage,
    isEditedAllowed,
    isDeletedAllowed,
    onAction,
    handleClose,
  };
};

export default useMessageActions;
