// EventEmitter.js
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    // console.log("EventEmitter emit", event, data);
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  off(event, listener) {
    if (this.listeners[event]) {
      // Filter out the listener to be removed
      this.listeners[event] = this.listeners[event].filter(
        (l) => l !== listener
      );

      // If no listeners remain, delete the event key
      if (this.listeners[event].length === 0) {
        delete this.listeners[event];
      }
    }
  }
}

const eventEmitter = new EventEmitter();
export default eventEmitter;
