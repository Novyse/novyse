import EventEmitter from "@/src/utils/global/Events/lib/EventEmitter";
import database from "@/src/utils/storage/database";

import messageUtils from "@/src/utils/chat/message";

class GlobalEventEmitter {
  constructor() {
    this.eventEmitter = EventEmitter;
  }

  getEmitter() {
    return this.eventEmitter;
  }

  async newMessage(message) {
    if (!message.fromSubscription) {
      await messageUtils.add(message);
    }
    const msg = await database.addSenderNameToMessage(message);
    //@SamueleOrazioDurante to be changes, devi usare un metodo che vada a carcare nel database, eventualmente lo vada a pullare dal server, ma solo temporaneamente (il pull completo viene fatto al join)
    this.eventEmitter.emit("message:new", msg);
  }

  async newChat(chat, messages = []) {
    await database.addChat(chat);

    if (messages.length > 0) {
      for (const message of messages) {
        await database.addMessage(message);
      }
    }
    this.eventEmitter.emit("newChat", chat);
  }

  async userJoined(chatUUID, user) {
    await database.addMember(chatUUID, user);
    this.eventEmitter.emit("userJoined", { chatUUID, user });
  }

  async userLeft(chatUUID, user) {
    await database.removeMember(chatUUID, user);
    this.eventEmitter.emit("userLeft", { chatUUID, user });
  }

  async fileReady(fileUUID, uri) {
    await database.updateFileURI(fileUUID, uri);
    this.eventEmitter.emit("fileReady", { fileUUID });
  }

  message = {
    update: async (chatUUID, messageID, action, data) => {
      switch (action) {
        case "edit":
          await database.message.edit(chatUUID, messageID, data.content);
          break;
        case "delete":
          await database.message.delete(chatUUID, messageID);
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
    pin: async (chatUUID, messageID) => {
      await database.message.pin.add(chatUUID, messageID);
      this.eventEmitter.emit("message:pinned", { chatUUID, messageID });
    },
    unpin: async (chatUUID, messageID) => {
      await database.message.pin.remove(chatUUID, messageID);
      this.eventEmitter.emit("message:unpinned", { chatUUID, messageID });
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
  };

  chat = {
    pin: {
      async add(chatUUID) {
        await database.pinChat(chatUUID);
        this.eventEmitter.emit("chat:pin:add", { chatUUID });
      },
      async remove(chatUUID) {
        await database.unpinChat(chatUUID);
        this.eventEmitter.emit("chat:pin:remove", { chatUUID });
      },
    },
  };
}

const eventEmitter = new GlobalEventEmitter();
export default eventEmitter;
