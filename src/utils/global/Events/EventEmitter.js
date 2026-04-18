import EventEmitter from "@/src/utils/global/Events/lib/EventEmitter";
import database from "@/src/utils/storage/database";

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
      if (message.reactions && Array.isArray(message.reactions)) {
        for (const reaction of message.reactions) {
          await database.message.reaction.add(
            message.chatUUID,
            message.id,
            reaction.reaction,
            reaction.created_at,
            reaction.userUUID,
          );
        }
      }
      this.eventEmitter.emit("message:new", message);
    },
    update: async (chatUUID, messageID, action, data) => {
      switch (action) {
        case "edit":
          await database.message.edit(chatUUID, messageID, data.content);
          break;
        case "delete":
          await database.message.delete(chatUUID, messageID);
          break;
        case "pin_add":
          await database.message.pin.add(
            chatUUID,
            messageID,
            data.pinned_at,
            data.userUUID,
          );
          break;
        case "pin_remove":
          await database.message.pin.remove(chatUUID, messageID);
          break;
        case "reaction_add":
          await database.message.reaction.add(
            chatUUID,
            messageID,
            data.reaction,
            data.at,
            data.userUUID,
          );
          break;
        case "reaction_remove":
          await database.message.reaction.remove(
            chatUUID,
            messageID,
            data.reaction,
            data.userUUID,
          );
          break;
        default:
          break;
      }

      this.eventEmitter.emit("message:update", {
        chatUUID,
        messageID,
        action,
        data,
      });
    },
  };

  user = {
    profile: {
      update: async (data) => {
        const {
          userUUID,
          name,
          surname,
          description,
          profilePictureUUID,
          birthday,
          region,
          country,
        } = data;

        if (!userUUID) return;

        if (name) {
          await database.user.profile.name.update(userUUID, name);
        }
        if (surname) {
          await database.user.profile.surname.update(userUUID, surname);
        }
        if (description) {
          await database.user.profile.description.update(userUUID, description);
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

        this.eventEmitter.emit("user:profile:update", {
          userUUID,
          name,
          surname,
          description,
          profilePictureUUID,
          birthday,
          region,
          country,
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
        for (const message of chat.messages) {
          await database.message.add(message);
        }
      }

      for (const user of users) {
        await database.user.add(user);
      }

      this.eventEmitter.emit("chat:new", { chat, users });
    },
    update: async (chatUUID, action, data) => {
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

      this.eventEmitter.emit("chat:update", {
        chatUUID,
        action,
        data,
      });
    },
    member: {
      join: async (chatUUID, user) => {
        await database.chat.member.add(chatUUID, user);
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
