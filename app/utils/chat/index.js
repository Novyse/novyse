import Database from "../storage/database";
import auth from "../welcome/auth";

const getChatUUIDAndHandle = (params) => {
  let chatUUID = null;
  let chatHandle = null;

  // Check if chatUUIDorHandle is handle or UUID
  if (params.chatUUIDorHandle.length < 33) {
    chatHandle = params.chatUUIDorHandle;
    // It's a handle, look up UUID
    (async () => {
      const database = await Database.create();
      const result = await database.getUUIDByHandle(params.chatUUIDorHandle);
      if (result) {
        let { uuid, type } = result;

        // If it's a user UUID or a bot UUID, try and get chat UUID
        if (type === "USER" || type === "BOT") {
          await database.getChatFromUserUUID(uuid).then((chat) => {
            if (chat) {
              uuid = chat.uuid;
            } else {
              console.warn(
                `AppContainer: route param chatUUIDorHandle=${params.chatUUIDorHandle} is a user handle, but no DM chat found.`
              );
            }
          });
        } else {
          // It's a chat, use directly
          console.log(
            `AppContainer: route param chatUUIDorHandle=${params.chatUUIDorHandle} is a handle, resolved to UUID ${uuid}, setting selectedChatUUID.`
          );
        }
        chatUUID = uuid;
      } else {
        console.warn(
          `AppContainer: route param chatUUIDorHandle=${params.chatUUIDorHandle} is a handle, but no chat found.`
        );
        chatUUID = null;
      }
    })();
  } else {
    // It's a UUID, use directly
    console.log(
      `AppContainer: route param chatUUID=${params.chatUUIDorHandle}, setting selectedChatUUID.`
    );
    chatUUID = params.chatUUIDorHandle;
  }
  return { chatUUID, chatHandle };
};

const getChatNameAndProfilePicture = async (chat) => {
  const database = await Database.create();

  let name = chat.name;
  let profilePictureUUID = chat.profile_picture_uuid;

  if (chat.type === "DM") {
    const user = await database.getUserByChatUUID(chat.uuid);
    name = user.name;
    profilePictureUUID = user.profile_picture_uuid;

    if (user.uuid === (await auth.getUserUUID())) {
      name = "Saved Messages";
      profilePictureUUID = null;
    }
  }
  return { name, profilePictureUUID };
};

export default { getChatUUIDAndHandle, getChatNameAndProfilePicture };
