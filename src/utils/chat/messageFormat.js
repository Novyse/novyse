import { getFileType } from "@/src/utils/storage/file/type";
import useUserStore from "@/src/context/UserContext";
import i18n from "@/src/i18n";
import { DateTime } from "luxon";

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
              IMAGE: {
                emoji: "📷",
                singular: i18n.t("messageFormat.fileType.image.singular"),
                plural: i18n.t("messageFormat.fileType.image.plural"),
              },
              VIDEO: {
                emoji: "📹",
                singular: i18n.t("messageFormat.fileType.video.singular"),
                plural: i18n.t("messageFormat.fileType.video.plural"),
              },
              AUDIO: {
                emoji: "🎵",
                singular: i18n.t("messageFormat.fileType.audio.singular"),
                plural: i18n.t("messageFormat.fileType.audio.plural"),
              },
              VOICE: {
                emoji: "🎤",
                singular: i18n.t("messageFormat.fileType.voice.singular"),
                plural: i18n.t("messageFormat.fileType.voice.plural"),
              },
              DOCUMENT: {
                emoji: "📄",
                singular: i18n.t("messageFormat.fileType.document.singular"),
                plural: i18n.t("messageFormat.fileType.document.plural"),
              },
              CODE: {
                emoji: "💻",
                singular: i18n.t("messageFormat.fileType.code.singular"),
                plural: i18n.t("messageFormat.fileType.code.plural"),
              },
              ARCHIVE: {
                emoji: "🗄️",
                singular: i18n.t("messageFormat.fileType.archive.singular"),
                plural: i18n.t("messageFormat.fileType.archive.plural"),
              },
            };
            const { emoji, singular, plural } = fileTypeMap[type] || {
              emoji: "📎",
              singular: i18n.t("messageFormat.fileType.default.singular"),
              plural: i18n.t("messageFormat.fileType.default.plural"),
            };

            let durationStr = "";
            if (
              count === 1 &&
              (type === "AUDIO" || type === "VIDEO" || type === "VOICE")
            ) {
              const file = message.files[0];
              if (file && file.duration) {
                const seconds = file.duration;
                const m = Math.floor(seconds / 60);
                const s = Math.floor(seconds % 60);
                durationStr = ` ${m}:${s.toString().padStart(2, "0")}`;
              }
            }

            message.content =
              count === 1
                ? `${emoji} ${singular}${durationStr}`
                : `${count} ${emoji} ${plural}`;
          } else {
            const hasOnlyMedia = uniqueTypes.every(
              (type) => type === "IMAGE" || type === "VIDEO",
            );
            message.content = hasOnlyMedia
              ? `${message.files.length} 📎 ${i18n.t("messageFormat.media")}`
              : `${message.files.length} 📎 ${i18n.t("messageFormat.files")}`;
          }
        }
      } else {
        const gifUrls = extractGifUrls(message.content);
        const textWithoutGifs = stripGifUrls(message.content);
        if (gifUrls.length > 0 && !textWithoutGifs) {
          message.content =
            gifUrls.length === 1
              ? `🎞️ ${i18n.t("messageFormat.fileType.gif.singular")}`
              : `${gifUrls.length} 🎞️ ${i18n.t("messageFormat.fileType.gif.plural")}`;
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
      text = i18n.t("messageFormat.system.chatCreated");
      break;
    case "USER_JOINED":
      if (message.content === localUserUUID) {
        name = i18n.t("messageFormat.system.you");
      } else {
        const user = getUser(message.content);
        name = user ? user.name : i18n.t("messageFormat.system.user");
      }
      text = i18n.t("messageFormat.system.userJoined", { name });
      break;
    case "USER_LEFT":
      if (message.content === localUserUUID) {
        name = i18n.t("messageFormat.system.you");
      } else {
        const user = getUser(message.content);
        name = user ? user.name : i18n.t("messageFormat.system.user");
      }
      text = i18n.t("messageFormat.system.userLeft", { name });
      break;
    default:
      text = i18n.t("messageFormat.system.systemMessage");
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
    return user ? user.name : i18n.t("messageFormat.system.user");
  });

  const getActionI18nKey = (action) => {
    switch (action) {
      case "TYPING":
        return "typing";
      case "RECORDING_VOICE":
        return "recording_voice";
      case "RECORDING_VIDEO":
        return "recording_video";
      case "UPLOADING_FILE":
        return "uploading_file";
      default:
        return "active";
    }
  };

  const actionKey = getActionI18nKey(majorityAction);

  let formattedActivity = "";
  if (count === 1) {
    formattedActivity = i18n.t(`messageFormat.activity.${actionKey}_one`, {
      name: names[0],
    });
  } else if (count === 2) {
    formattedActivity = i18n.t(`messageFormat.activity.${actionKey}_two`, {
      name: names[0],
      name2: names[1],
    });
  } else {
    formattedActivity = i18n.t(`messageFormat.activity.${actionKey}_other`, {
      name: names[0],
      name2: names[1],
      count: count - 2,
    });
  }

  return formattedActivity;
};

/**
 * Format a date for "last seen" status
 * @param {Date|String} lastAccessAt
 * @returns {String} formatted text
 */
const formatLastSeen = (lastAccessAt) => {
  if (!lastAccessAt) return "";

  try {
    const date = DateTime.fromISO(new Date(lastAccessAt).toISOString(), {
      zone: "utc",
    }).toLocal();
    const now = DateTime.now();
    const diffMs = now.toMillis() - date.toMillis();

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return i18n.t("messageFormat.time.justNow");
    if (diffSecs < 60)
      return i18n.t("messageFormat.time.secondsAgo", { count: diffSecs });
    if (diffMins < 60)
      return i18n.t("messageFormat.time.minutesAgo", { count: diffMins });
    if (diffHours < 24)
      return i18n.t("messageFormat.time.hoursAgo", { count: diffHours });
    if (diffDays === 1) return i18n.t("messageFormat.time.yesterday");
    if (diffDays < 7)
      return i18n.t("messageFormat.time.daysAgo", { count: diffDays });

    return date.setLocale(i18n.language).toLocaleString(DateTime.DATE_FULL);
  } catch (e) {
    return "";
  }
};

/** .gif link */
const GIF_URL_REGEX = /https?:\/\/[^\s<>"'`]+?\.gif(?:\?[^\s<>"'`]*)?/gi;

const normalizeGifUrl = (raw) =>
  raw
    .trim()
    .replace(/[),.;!?]+$/, "")
    .replace(/^http:/, "https:");

const extractGifUrls = (content) => {
  if (!content) return [];
  GIF_URL_REGEX.lastIndex = 0;
  const matches = content.match(GIF_URL_REGEX) || [];
  const seen = new Set();
  const result = [];
  for (const raw of matches) {
    const url = normalizeGifUrl(raw);
    if (!seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
};

const stripGifUrls = (content) => {
  if (!content) return "";
  return content
    .replace(GIF_URL_REGEX, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const getGifMediaUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const normalized = normalizeGifUrl(url);
  if (/\.gif(?:\?|$)/i.test(normalized)) return normalized;
  return null;
};

export default {
  format,
  getSystemMessageText,
  formatActivity,
  formatLastSeen,
  extractGifUrls,
  stripGifUrls,
  getGifMediaUrl,
};
