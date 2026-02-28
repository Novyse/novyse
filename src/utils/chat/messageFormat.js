import utils from "@/src/utils/chat";
import { getFileType } from "@/src/utils/storage/file/type";

const format = async (messageRef) => {
  if (!messageRef) return messageRef;

  const message = { ...messageRef };

  if (message && message.type) {
    if (message.type == "system") {
      message.content = await utils.getSystemMessageText(message);
    } else if (message.type == "message") {
      if (!message.content) {
        if (message.files && message.files.length > 0) {
          const types = message.files.map((file) =>
            getFileType(file.mimeType, file.name),
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

export default { format };
