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
}

const eventEmitter = new MessengerEventEmitter();
export default eventEmitter;
