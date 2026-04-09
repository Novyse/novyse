import { getFileType } from "@/src/utils/storage/file/type";
import useUserStore from "@/context/UserContext";

const format = (messageRef) => {
  if (!messageRef) return messageRef;

  const message = { ...messageRef };

  if (message && message.type) {
    if (message.type == "system") {
      message.content = getSystemMessageText(message);
    } else if (message.type == "message" || message.type == "DRAFT") {
      if (!message.content || message.content.trim() === "") {
        if (message.files && message.files.length > 0) {
          const types = message.files.map((file) =>
            getFileType(file.mimeType || file.type, file.name),
          );
          const uniqueTypes = [...new Set(types)];
          if (uniqueTypes.length === 1) {
            const type = uniqueTypes[0];
            const count = types.length;
            const fileTypeMap = {
              IMAGE: { emoji: "📷", singular: "Image", plural: "Images" },
              VIDEO: { emoji: "📹", singular: "Video", plural: "Videos" },
              AUDIO: { emoji: "🎵", singular: "Audio", plural: "Audios" },
              VOICE: {
                emoji: "🎤",
                singular: "Voice Message",
                plural: "Voice Messages",
              },
              DOCUMENT: {
                emoji: "📄",
                singular: "Document",
                plural: "Documents",
              },
              CODE: {
                emoji: "💻",
                singular: "Code File",
                plural: "Code Files",
              },
              ARCHIVE: {
                emoji: "🗄️",
                singular: "Archive File",
                plural: "Archive Files",
              },
            };
            const { emoji, singular, plural } = fileTypeMap[type] || {
              emoji: "📎",
              singular: "File",
              plural: "Files",
            };
            message.content =
              count === 1
                ? `${emoji} ${singular}`
                : `${count} ${emoji} ${plural}`;
          } else {
            const hasOnlyMedia = uniqueTypes.every(
              (type) => type === "IMAGE" || type === "VIDEO",
            );
            message.content = hasOnlyMedia
              ? `${message.files.length} 📎 Media`
              : `${message.files.length} 📎 Files`;
          }
        }
      }
    }
  }
  return message;
};

/**
 * Get real text from system message object
 * @param {Object} message
 * @returns {String} text
 */
const getSystemMessageText = (message) => {
  let text = "";
  let name = "User";

  const { localUserUUID, getUser } = useUserStore.getState();

  switch (message.system_action) {
    case "CHAT_CREATED":
      text = "Chat created";
      break;
    case "USER_JOINED":
      if (message.content === localUserUUID) {
        name = "You";
      } else {
        const user = getUser(message.content);
        name = user ? user.name : "User";
      }
      text = `${name} joined the chat`;
      break;
    case "USER_LEFT":
      if (message.content === localUserUUID) {
        name = "You";
      } else {
        const user = getUser(message.content);
        name = user ? user.name : "User";
      }
      text = `${name} left the chat`;
      break;
    default:
      text = "System message";
  }
  return text;
};

/**
 * Get real text from member activity data
 * @param {Array} memberActivityData
 * @returns {String} text
 */
const formatActivity = (memberActivityData, chatType) => {
  if (!memberActivityData || memberActivityData.length === 0) return "";

  const { localUserUUID, getUser } = useUserStore.getState();

  const activeActivities = memberActivityData.filter(
    (a) => a.action && a.userUUID !== localUserUUID,
  );

  if (activeActivities.length === 0) return "";

  // Group by action to find majority
  const actionsMap = {};
  const actionOrder = [];
  activeActivities.forEach((a) => {
    if (!actionsMap[a.action]) {
      actionsMap[a.action] = [];
      actionOrder.push(a.action);
    }
    actionsMap[a.action].push(a);
  });

  // Find the action with the most participants (majority)
  let majorityAction = actionOrder[0];
  let maxCount = actionsMap[majorityAction].length;

  actionOrder.forEach((action) => {
    const count = actionsMap[action].length;
    if (count > maxCount) {
      maxCount = count;
      majorityAction = action;
    }
  });

  const participants = actionsMap[majorityAction];
  const count = participants.length;
  const names = participants.map((p) => {
    const user = getUser(p.userUUID);
    return user ? user.name : "User";
  });

  const getActionVerb = (action, isPlural) => {
    const verb = isPlural ? "are" : "is";
    switch (action) {
      case "TYPING":
        return `${verb} typing`;
      case "RECORDING_VOICE":
        return `${verb} recording a voice message`;
      case "RECORDING_VIDEO":
        return `${verb} recording a video message`;
      case "UPLOADING_FILE":
        return `${verb} uploading`;
      default:
        return `${verb} active`;
    }
  };

  let formattedActivity = "";
  if (count === 1) {
    formattedActivity = `${names[0]} ${getActionVerb(majorityAction, false)}`;
  } else if (count === 2) {
    formattedActivity = `${names[0]} and ${names[1]} ${getActionVerb(majorityAction, true)}`;
  } else {
    formattedActivity = `${names[0]}, ${names[1]} and others ${count - 2} ${getActionVerb(majorityAction, true)}`;
  }

  return formattedActivity + "...";
};

export default { format, getSystemMessageText, formatActivity };
