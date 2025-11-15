import {
  LOG_LEVELS,
  LOG_LEVEL_NAMES,
  LOG_COLORS,
  LOG_EMOJIS,
} from "./LogLevels.js";

/**
 * Sistema di logging centralizzato per WebRTC
 *
 * Funzionalità:
 * - Filtraggio per livello di importanza
 * - Categorie di log per organizzare i messaggi
 * - Timestamp e metadata
 * - Output colorato per console
 * - Possibilità di salvare i log in memoria per debugging
 */
class WebRTCLogger {
  constructor() {
    // Livello minimo di log da mostrare (i log >= a questo valore verranno mostrati)
    this.currentLogLevel = LOG_LEVELS?.INFO || 4; // Default: mostra INFO e superiori

    // Buffer per salvare i log in memoria (per debugging)
    this.logBuffer = [];
    this.maxBufferSize = 1000; // Massimo 1000 log in memoria

    // Flag per abilitare/disabilitare completamente il logging
    this.enabled = true;

    // Flag per abilitare il buffer in memoria
    this.bufferEnabled = true;

    // Prefisso per tutti i log WebRTC
    this.prefix = "[WebRTC]";

    // Reset code per i colori
    this.resetColor = "\x1b[0m";
  }
  /**
   * Imposta il livello minimo di log
   * @param {number} level - Livello da LOG_LEVELS
   */
  setLogLevel(level) {
    if (LOG_LEVELS && Object.values(LOG_LEVELS).includes(level)) {
      this.currentLogLevel = level;
      this.info(
        "Logger",
        `Log level impostato a: ${LOG_LEVEL_NAMES?.[level] || level} (${level})`
      );
    } else {
      this.error("Logger", `Livello di log non valido: ${level}`);
    }
  }

  /**
   * Ottieni il livello di log corrente
   * @returns {number} Livello corrente
   */
  getLogLevel() {
    return this.currentLogLevel;
  }

  /**
   * Abilita/disabilita il logging
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Abilita/disabilita il buffer in memoria
   * @param {boolean} enabled
   */
  setBufferEnabled(enabled) {
    this.bufferEnabled = enabled;
    if (!enabled) {
      this.logBuffer = [];
    }
  }

  /**
   * Metodo generico per loggare
   * @param {number} level - Livello del log
   * @param {string} category - Categoria del log
   * @param {string} message - Messaggio
   * @param {...any} data - Dati aggiuntivi
   */
  _log(level, category, message, ...data) {
    // Verifica se il logging è abilitato
    if (!this.enabled) return;

    // Verifica se il livello del log è sufficientemente alto
    if (level < this.currentLogLevel) return;
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES?.[level] || `LEVEL_${level}`;
    const emoji = LOG_EMOJIS?.[level] || "📝";
    const color = LOG_COLORS?.[level] || "";

    // Formato del messaggio
    const formattedMessage = `${this.prefix} ${emoji} [${levelName}] [${category}] ${message}`;

    // Log colorato per console
    const coloredMessage = `${color}${formattedMessage}${this.resetColor}`; // Output su console in base al livello
    const errorLevel = LOG_LEVELS?.ERROR || 8;
    const warningLevel = LOG_LEVELS?.WARNING || 6;

    if (level >= errorLevel) {
      console.error(coloredMessage, ...data);
    } else if (level >= warningLevel) {
      console.warn(coloredMessage, ...data);
    } else {
      console.log(coloredMessage, ...data);
    }

    // Salva nel buffer se abilitato
    if (this.bufferEnabled) {
      this._addToBuffer({
        timestamp,
        level,
        levelName,
        category,
        message,
        data: data.length > 0 ? data : null,
      });
    }
  }

  /**
   * Aggiunge un log al buffer in memoria
   * @param {Object} logEntry
   */
  _addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);

    // Mantieni solo gli ultimi N log
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  // ===== METODI PER I DIVERSI LIVELLI DI LOG =====
  /**
   * Log critico - per errori che compromettono completamente la funzionalità
   * @param {string} category
   * @param {string} message
   * @param {...any} data
   */
  critical(category, message, ...data) {
    // Handle flexible parameter formats
    if (typeof message === "object") {
      data = [message];
      message = category;
      category = "Critical";
    }

    // Convert objects to formatted strings
    const formattedMessage =
      typeof message === "object" ? safeStringify(message) : message;
    const formattedData = data.map((item) =>
      typeof item === "object" ? safeStringify(item) : item
    );

    this._log(
      LOG_LEVELS?.CRITICAL || 10,
      category,
      formattedMessage,
      ...formattedData
    );
  }

  /**
   * Log errore - per errori gravi che impattano la connessione
   * @param {string} category
   * @param {string} message
   * @param {...any} data
   */
  error(category, message, ...data) {
    // Handle flexible parameter formats
    if (typeof message === "object") {
      data = [message];
      message = category;
      category = "Error";
    }

    // Convert objects to formatted strings
    const formattedMessage =
      typeof message === "object" ? safeStringify(message) : message;
    const formattedData = data.map((item) =>
      typeof item === "object" ? safeStringify(item) : item
    );

    this._log(
      LOG_LEVELS?.ERROR || 8,
      category,
      formattedMessage,
      ...formattedData
    );
  }

  warn(category, message, ...data) {
    this.warning(category, message, ...data);
  }

  /**
   * Log warning - per avvisi su situazioni anomale
   * @param {string} category
   * @param {string} message
   * @param {...any} data
   */
  warning(category, message, ...data) {
    // Handle flexible parameter formats
    if (typeof message === "object") {
      data = [message];
      message = category;
      category = "Warning";
    }

    // Convert objects to formatted strings
    const formattedMessage =
      typeof message === "object" ? safeStringify(message) : message;
    const formattedData = data.map((item) =>
      typeof item === "object" ? safeStringify(item) : item
    );

    this._log(
      LOG_LEVELS?.WARNING || 6,
      category,
      formattedMessage,
      ...formattedData
    );
  }

  /**
   * Log info - per informazioni generali sul flusso normale
   * @param {string} category
   * @param {string} message
   * @param {...any} data
   */
  info(category, message, ...data) {
    // Handle flexible parameter formats
    if (typeof message === "object") {
      data = [message];
      message = category;
      category = "Info";
    }

    // Convert objects to formatted strings
    const formattedMessage =
      typeof message === "object" ? safeStringify(message) : message;
    const formattedData = data.map((item) =>
      typeof item === "object" ? safeStringify(item) : item
    );

    this._log(
      LOG_LEVELS?.INFO || 4,
      category,
      formattedMessage,
      ...formattedData
    );
  }

  /**
   * Log debug - per dettagli utili al debugging
   * @param {string} category
   * @param {string} message
   * @param {...any} data
   */
  debug(category, message, ...data) {
    // Handle flexible parameter formats
    if (typeof message === "object") {
      data = [message];
      message = category;
      category = "Debug";
    }

    // Convert objects to formatted strings
    const formattedMessage =
      typeof message === "object" ? safeStringify(message) : message;
    const formattedData = data.map((item) =>
      typeof item === "object" ? safeStringify(item) : item
    );

    this._log(
      LOG_LEVELS?.DEBUG || 2,
      category,
      formattedMessage,
      ...formattedData
    );
  }

  /**
   * Log verbose - per dettagli molto specifici
   * @param {string} category
   * @param {string} message
   * @param {...any} data
   */
  verbose(category, message, ...data) {
    // Handle flexible parameter formats
    if (typeof message === "object") {
      data = [message];
      message = category;
      category = "Verbose";
    }

    // Convert objects to formatted strings
    const formattedMessage =
      typeof message === "object" ? safeStringify(message) : message;
    const formattedData = data.map((item) =>
      typeof item === "object" ? safeStringify(item) : item
    );

    this._log(
      LOG_LEVELS?.VERBOSE || 1,
      category,
      formattedMessage,
      ...formattedData
    );
  }

  // ===== METODI DI UTILITÀ =====

  /**
   * Ottieni tutti i log dal buffer
   * @returns {Array} Array di log entries
   */
  getLogs() {
    return [...this.logBuffer];
  }

  /**
   * Ottieni log filtrati per categoria
   * @param {string} category
   * @returns {Array} Array di log entries per la categoria
   */
  getLogsByCategory(category) {
    return this.logBuffer.filter((log) => log.category === category);
  }

  /**
   * Ottieni log filtrati per livello
   * @param {number} minLevel
   * @returns {Array} Array di log entries del livello specificato e superiori
   */
  getLogsByLevel(minLevel) {
    return this.logBuffer.filter((log) => log.level >= minLevel);
  }

  /**
   * Pulisci il buffer dei log
   */
  clearLogs() {
    this.logBuffer = [];
    this.info("Logger", "Buffer dei log svuotato");
  }

  /**
   * Esporta i log come stringa JSON
   * @returns {string} Log in formato JSON
   */
  exportLogs() {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * Stampa un report del sistema di logging
   */ printLogReport() {
    console.log("\n📊 ===== WEBRTC LOGGING REPORT =====");
    console.log(
      `🎛️  Livello corrente: ${
        LOG_LEVEL_NAMES?.[this.currentLogLevel] || this.currentLogLevel
      } (${this.currentLogLevel})`
    );
    console.log(`🔧 Logging abilitato: ${this.enabled ? "✅" : "❌"}`);
    console.log(`💾 Buffer abilitato: ${this.bufferEnabled ? "✅" : "❌"}`);
    console.log(
      `📝 Log in buffer: ${this.logBuffer.length}/${this.maxBufferSize}`
    );

    if (this.logBuffer.length > 0) {
      const logsByLevel = {};
      this.logBuffer.forEach((log) => {
        if (!logsByLevel[log.level]) {
          logsByLevel[log.level] = 0;
        }
        logsByLevel[log.level]++;
      });

      console.log("\n📈 Distribuzione per livello:");
      Object.entries(logsByLevel)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .forEach(([level, count]) => {
          const levelName = LOG_LEVEL_NAMES?.[level] || `LEVEL_${level}`;
          const emoji = LOG_EMOJIS?.[level] || "📝";
          console.log(`   ${emoji} ${levelName}: ${count}`);
        });

      const categories = [
        ...new Set(this.logBuffer.map((log) => log.category)),
      ];
      console.log(`\n🏷️  Categorie attive: ${categories.join(", ")}`);
    }

    console.log("===== END LOGGING REPORT =====\n");
  }
}

/**
 * Helper function to safely stringify objects for logging
 * @param {any} value - The value to stringify
 * @returns {string} - The stringified value
 */
function safeStringify(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (typeof value === "object") {
    try {
      // Pretty format with 2-space indentation for better readability
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return `[Object serialization failed: ${err.message}]`;
    }
  }

  return String(value);
}

// Istanza singleton del logger
const logger = new WebRTCLogger();

export default logger;
export { LOG_LEVELS };
