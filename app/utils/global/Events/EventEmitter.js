import EventEmitter from "./lib/EventEmitter";
import Database from "../../storage/database";

class MessengerEventEmitter {
  constructor() {
    this.eventEmitter = EventEmitter;
  }

  getEmitter() {
    return this.eventEmitter;
  }

  async newMessage(message) {
    const database = await Database.create();
    await database.addMessage(message);
    const msg = await database.addSenderNameToMessage(message);
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
}

const eventEmitter = new MessengerEventEmitter();
export default eventEmitter;
