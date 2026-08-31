import EventEmitter from "@/src/utils/global/Events/lib/EventEmitter";
import database from "@/src/utils/storage/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

class GlobalEventEmitter {
  constructor() {
    this.eventEmitter = EventEmitter;
  }

  getEmitter() {
    return this.eventEmitter;
  }

  async fileReady(fileUUID, uri) {
    await database.updateFileURI(fileUUID, uri);
    this.eventEmitter.emit("fileReady", { fileUUID });
  }

  message = {
    new: async (message) => {
      await database.message.add(message);
      this.eventEmitter.emit("message:new", message);
    },
    update: async (chatUUID, subID, messageID, action, eventID, data) => {
      switch (action) {
        case "edit":
          await database.message.edit(chatUUID, subID, messageID, data.content);
          break;
        case "delete":
          await database.message.delete(chatUUID, subID, messageID);
          break;
        case "pin_add":
          await database.message.pin.add(
            chatUUID,
            subID,
            messageID,
            data.pinnedAt,
            data.userUUID,
          );
          break;
        case "pin_remove":
          await database.message.pin.remove(chatUUID, subID, messageID);
          break;
        case "reaction_add":
          await database.message.reaction.add(
            chatUUID,
            subID,
            messageID,
            data.reaction,
            data.reactedAt,
            data.userUUID,
          );
          break;
        case "reaction_remove":
          await database.message.reaction.remove(
            chatUUID,
            subID,
            messageID,
            data.reaction,
            data.userUUID,
          );
          break;
        case "read":
          await database.message.read.add(
            chatUUID,
            subID,
            messageID,
            data.userUUID,
            data.readAt,
          );
          break;
        default:
          break;
      }

      if (eventID) {
        await database.event.chat.update(chatUUID, eventID);
      }

      this.eventEmitter.emit("message:update", {
        chatUUID,
        subID,
        messageID,
        action,
        data,
      });
    },
  };

  user = {
    setting: {
      chat: {
        update: async (chatUUID, action, eventID, data) => {
          switch (action) {
            case "pin_add":
              await database.chat.pin.add(chatUUID, data.position);
              break;
            case "pin_remove":
              await database.chat.pin.remove(chatUUID);
              break;
            default:
              break;
          }

          if (eventID) {
            await AsyncStorage.setItem("userEventID", String(eventID));
          }

          this.eventEmitter.emit("user:setting:chat:update", {
            chatUUID,
            action,
            data,
          });
        },
      },
    },
    profile: {
      update: async (data, eventID) => {
        const {
          userUUID,
          name,
          surname,
          biography,
          profilePictureUUID,
          bannerPictureUUID,
          birthday,
          region,
          country,
          color,
          handle,
        } = data;

        if (!userUUID) return;

        if (name) {
          await database.user.profile.name.update(userUUID, name);
        }
        if (surname) {
          await database.user.profile.surname.update(userUUID, surname);
        }
        if (biography) {
          await database.user.profile.biography.update(userUUID, biography);
        }
        if (profilePictureUUID) {
          await database.user.profile.picture.update(
            userUUID,
            profilePictureUUID,
          );
        }
        if (birthday) {
          await database.user.profile.birthday.update(userUUID, birthday);
        }
        if (region) {
          await database.user.profile.region.update(userUUID, region);
        }
        if (country) {
          await database.user.profile.country.update(userUUID, country);
        }
        if (bannerPictureUUID) {
          await database.user.profile.banner.update(
            userUUID,
            bannerPictureUUID,
          );
        }
        if (color) {
          await database.user.profile.color.update(userUUID, color);
        }
        if (handle) {
          await database.handle.update.user(userUUID, handle);
        }

        if (eventID) {
          await database.event.user.profile.update(userUUID, eventID);
        }

        this.eventEmitter.emit("user:profile:update", {
          userUUID,
          name,
          surname,
          biography,
          profilePictureUUID,
          bannerPictureUUID,
          birthday,
          region,
          country,
          color,
          handle,
        });
      },
    },
    presence: {
      update: async (userUUID, status, lastAccessAt = null) => {
        this.eventEmitter.emit("user:presence:update", {
          userUUID,
          status,
          lastAccessAt,
        });
      },
    },
  };

  chat = {
    new: async (chat, users) => {
      if (!chat) return;
      await database.chat.add(chat);

      if (chat.messages && chat.messages.length > 0) {
        await database.message.addMultiple(chat.messages);
      }

      for (const user of users) {
        await database.user.add(user);
      }

      this.eventEmitter.emit("chat:new", { chat, users });
    },
    update: async (chatUUID, action, eventID, data) => {
      switch (action) {
        case "sub_create":
          await database.chat.sub.add(chatUUID, data.sub || data);
          break;
        case "sub_rename": {
          const renamedSub = data.sub || data;
          await database.chat.sub.update(chatUUID, renamedSub.id, {
            name: renamedSub.name,
          });
          break;
        }
        case "sub_delete":
          await database.chat.sub.remove(chatUUID, data.subID ?? data.id);
          break;
        default:
          break;
      }

      if (eventID) {
        await database.event.chat.update(chatUUID, eventID);
      }

      this.eventEmitter.emit("chat:update", {
        chatUUID,
        action,
        data,
      });
    },
    member: {
      join: async (chatUUID, user, eventID) => {
        await database.chat.member.add(chatUUID, user);
        if (eventID) {
          await database.event.chat.update(chatUUID, eventID);
        }
        await database.user.add(user);
        this.eventEmitter.emit("chat:member:joined", { chatUUID, user });
      },
      leave: async (chatUUID, user) => {
        await database.chat.member.remove(chatUUID, user);
        this.eventEmitter.emit("chat:member:left", { chatUUID, user });
      },
      activity: async (chatUUID, userUUID, action) => {
        this.eventEmitter.emit("chat:member:activity", {
          chatUUID,
          userUUID,
          action,
        });
      },
    },
  };
}

const eventEmitter = new GlobalEventEmitter();
export default eventEmitter;
