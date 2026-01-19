import database from "@/src/utils/storage/database";
import auth from "@/src/utils/welcome/auth";
import gateway from "@/src/utils/backend-services/api-gateway";

const getChatData = async (chatUUIDorHandle) => {
  let chatUUID = null;
  let chatHandle = null;
  let chatName = null;
  let chatPictureUUID = null;

  

  const isHandle = chatUUIDorHandle.length < 33;

  if (!isHandle) {
    chatUUID = chatUUIDorHandle;
    const chat = await database.getChatByUUID(chatUUID);
    if (chat) {
      const { name: realName, chatPictureUUID: realPictureUUID } =
        await getChatNameAndProfilePicture(chat);
      chatName = realName;
      chatPictureUUID = realPictureUUID;
    }
  } else {
    chatHandle = chatUUIDorHandle;
    // Look up UUID by handle
    const result = await database.getUUIDByHandle(chatUUIDorHandle);
    if (result) {
      // If found, get UUID and type, then check
      let { uuid, type } = result;
      // If it's a user UUID or a bot UUID, try and get chat UUID
      if (type === "USER" || type === "BOT") {
        const chat = await database.getChatFromUserUUID(uuid);
        if (chat) {
          uuid = chat.uuid;
          const { name: realName, chatPictureUUID: realPictureUUID } =
            await getChatNameAndProfilePicture(chat);
          chatName = realName;
          chatPictureUUID = realPictureUUID;
        } else {
          console.warn(
            `ChatUtils.js: route param chatUUIDorHandle=${chatUUIDorHandle} is a user handle, but no DM chat found.`,
          );
        }
      } else {
        // If it's a chat, use directly
        chatUUID = uuid;
        const chat = await database.getChatByUUID(chatUUID);
        if (chat) {
          const { name: realName, chatPictureUUID: realPictureUUID } =
            await getChatNameAndProfilePicture(chat);
          chatName = realName;
          chatPictureUUID = realPictureUUID;
        }
        console.log(
          `ChatUtils.js: route param chatUUIDorHandle=${chatUUIDorHandle} is a handle, resolved to UUID ${uuid}, setting selectedChatUUID.`,
        );
      }
    } else {
      // If handle is not found in local DB, log warning and try to fetch from gateway basic info to create/join chat
      console.warn(
        `ChatUtils.js: route param chatUUIDorHandle=${chatUUIDorHandle} is a handle, but no chat found. Asking gateway for info.`,
      );
      const { success, data } = await gateway.gather.handle(chatHandle, false);
      if (success) {
        const { type } = data;
        switch (type) {
          case "USER":
            chatName = `${data.name} ${data.surname}`;
            chatPictureUUID = data.profilePictureUUID;
            break;
          case "BOT":
            chatName = data.name;
            chatPictureUUID = null;
          case "GROUP":
          case "CHANNEL":
          case "FORUM":
            chatName = data.name;
            chatPictureUUID = data.profilePictureUUID;
            break;
          default:
            chatName = "How";
            chatPictureUUID = null;
        }
      }
    }
  }
  return { chatUUID, chatHandle, chatName, chatPictureUUID };
};

/**
 * Get chat name and profile picture UUID
 * @param {Object} chat
 * @returns {Object} { name, chatPictureUUID }
 */

const getChatNameAndProfilePicture = async (chat, myProfilePictureUUID) => {
  

  let name = chat.name;
  let chatPictureUUID = chat.profilePictureUUID;

  if (chat.type === "DM") {
    const user = await database.getUserByChatUUID(chat.uuid);
    name = user.name;
    chatPictureUUID = user.profilePictureUUID;

    if (user.uuid === (await auth.getUserUUID())) {
      name = "Saved Messages";
      chatPictureUUID = myProfilePictureUUID;
    }
  }
  return { name, chatPictureUUID };
};

/**
 * Get real text from system message object
 * @param {Object} message
 * @returns {String} text
 */
const getSystemMessageText = async (message) => {
  let text = "";
  let name = "User";

  switch (message.system_action) {
    case "CHAT_CREATED":
      text = "Chat created";
      break;
    case "USER_JOINED":
      if (message.content == (await auth.getUserUUID())) {
        name = "You";
      } else {
        
        const user = await database.getUserByUUID(message.content);
        name = user ? user.name : "User";
      }
      text = `${name} joined the chat`;
      break;
    case "USER_LEFT":
      if (message.content == (await auth.getUserUUID())) {
        name = "You";
      } else {
        
        const user = await database.getUserByUUID(message.content);
        name = user ? user.name : "User";
      }
      text = `${name} left the chat`;
      break;
    default:
      text = "System message";
  }
  return text;
};

export default {
  getChatData,
  getChatNameAndProfilePicture,
  getSystemMessageText,
};
