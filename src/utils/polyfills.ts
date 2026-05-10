// Polyfill for DOMException needed by livekit-client
if (typeof DOMException === "undefined") {
  class DOMExceptionPolyfill extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || "DOMException";
    }
  }
  // @ts-ignore
  global.DOMException = DOMExceptionPolyfill;
}