import EventEmitter from "./lib/EventEmitter";
import Database from "../../storage/database";

class MessengerEventEmitter {
  constructor() {
    this.eventEmitter = EventEmitter;
  }

  getEmitter() {
    return this.eventEmitter;
  }

  // Delegate standard EventEmitter methods so consumers can call eventEmitter.on / off / once / emit
  on(event, listener) {
    return this.eventEmitter.on(event, listener);
  }

  off(event, listener) {
    // support both off (modern) and removeListener (older implementations)
    if (typeof this.eventEmitter.off === "function") {
      return this.eventEmitter.off(event, listener);
    }
    if (typeof this.eventEmitter.removeListener === "function") {
      return this.eventEmitter.removeListener(event, listener);
    }
    return undefined;
  }

  once(event, listener) {
    if (typeof this.eventEmitter.once === "function") {
      return this.eventEmitter.once(event, listener);
    }
    // fallback: manual once
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    return this.eventEmitter.emit(event, ...args);
  }

  addListener(event, listener) {
    return this.on(event, listener);
  }

  removeListener(event, listener) {
    return this.off(event, listener);
  }

  async newMessage(message) {
    const database = await Database.create();
    if (!message.fromSubscription) {
      await database.addMessage(message);
    }
    const msg = await database.addSenderNameToMessage(message);
    //@SamueleOrazioDurante to be changes, devi usare un metodo che vada a carcare nel database, eventualmente lo vada a pullare dal server, ma solo temporaneamente (il pull completo viene fatto al join)
    this.eventEmitter.emit("newMessage", msg);
  }

  async newChat(chat, messages = []) {
    const database = await Database.create();
    await database.addChat(chat);

    if (messages.length > 0) {
      for (const message of messages) {
        await database.addMessage(message);
      }
    }
    this.eventEmitter.emit("newChat", chat);
  }

  async userJoined(chatUUID, user) {
    const database = await Database.create();
    await database.addMember(chatUUID, user);
    this.eventEmitter.emit("userJoined", { chatUUID, user });
  }

  async userLeft(chatUUID, user) {
    const database = await Database.create();
    await database.removeMember(chatUUID, user);
    this.eventEmitter.emit("userLeft", { chatUUID, user });
  }

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

const eventEmitter = new MessengerEventEmitter();
export default eventEmitter;
