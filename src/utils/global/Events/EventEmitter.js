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

  user = {
    profile: {
      update: async (data) => {
        const { userUUID, name, surname, description, profilePictureUUID } =
          data;

        if (!userUUID) return;

        if (name !== undefined) {
          await database.user.profile.name.update(userUUID, name);
        }
        if (surname !== undefined) {
          await database.user.profile.surname.update(userUUID, surname);
        }
        if (description !== undefined) {
          await database.user.profile.description.update(userUUID, description);
        }
        if (profilePictureUUID !== undefined) {
          await database.user.profile.picture.update(
            userUUID,
            profilePictureUUID,
          );
        }

        this.eventEmitter.emit("user:profile:update", {
          userUUID,
          name,
          surname,
          description,
          profilePictureUUID,
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

  // -------------------- WebRTC EVENTS --------------------
  commsJoin(data) {
    this.eventEmitter.emit("comms_join", data);
  }

  commsLeave(data) {
    this.eventEmitter.emit("comms_leave", data);
  }

  commsScreenShareStart(data) {
    this.eventEmitter.emit("comms_screen_share_start", data);
  }

  commsScreenShareStop(data) {
    this.eventEmitter.emit("comms_screen_share_stop", data);
  }

  commsCandidate(data) {
    this.eventEmitter.emit("comms_candidate", data);
  }

  commsOffer(data) {
    this.eventEmitter.emit("comms_offer", data);
  }

  commsAnswer(data) {
    this.eventEmitter.emit("comms_answer", data);
  }

  commsSpeaking(data) {
    this.eventEmitter.emit("comms_speaking", data);
  }

  commsNotSpeaking(data) {
    this.eventEmitter.emit("comms_not_speaking", data);
  }

  commsMidToUUIDMapping(data) {
    this.eventEmitter.emit("comms_mid_to_uuid_mapping", data);
  }

  commsWebcamOn(data) {
    this.eventEmitter.emit("comms_webcam_on", data);
  }

  commsWebcamOff(data) {
    this.eventEmitter.emit("comms_webcam_off", data);
  }
}

const eventEmitter = new GlobalEventEmitter();
export default eventEmitter;
