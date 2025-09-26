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
    const msg = await database.addSenderNameToMessage(message);
    this.eventEmitter.emit("newMessage", msg);
  }

  async newChat(chat) {
    const database = await Database.create();
    this.eventEmitter.emit("newChat", chat);
    await database.addChat(chat);
  }
}

const eventEmitter = new MessengerEventEmitter();
export default eventEmitter;
