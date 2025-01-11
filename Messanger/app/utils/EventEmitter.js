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
    console.log("EventEmitter emit");
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  off(event, listener) {
    if (this.events[event]) {
        // Filtra solo i listener diversi da quello passato
        this.events[event] = this.events[event].filter(l => l !== listener);

        // Se l'array dei listener diventa vuoto, puoi rimuovere l'evento per evitare spazio sprecato
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }
}

}

const eventEmitter = new EventEmitter();
export default eventEmitter;
