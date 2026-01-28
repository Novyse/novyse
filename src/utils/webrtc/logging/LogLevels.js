/**
 * Definizione dei livelli di log per il sistema WebRTC
 *
 * Livelli di importanza:
 * - CRITICAL (10): Errori critici che compromettono completamente la funzionalità
 * - ERROR (8): Errori gravi che impattano la connessione ma non sono fatali
 * - WARNING (6): Avvisi importanti su situazioni anomale
 * - INFO (4): Informazioni generali sul flusso normale
 * - DEBUG (2): Dettagli per il debugging
 * - VERBOSE (1): Log molto dettagliati per troubleshooting intensivo
 */
export const LOG_LEVELS = {
  CRITICAL: 10,
  ERROR: 8,
  WARNING: 6,
  INFO: 4,
  DEBUG: 2,
  VERBOSE: 1,
};

/**
 * Nomi leggibili per i livelli di log
 */
export const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.CRITICAL]: "CRITICAL",
  [LOG_LEVELS.ERROR]: "ERROR",
  [LOG_LEVELS.WARNING]: "WARNING",
  [LOG_LEVELS.INFO]: "INFO",
  [LOG_LEVELS.DEBUG]: "DEBUG",
  [LOG_LEVELS.VERBOSE]: "VERBOSE",
};

/**
 * Colori per i livelli di log (per console)
 */
export const LOG_COLORS = {
  [LOG_LEVELS.CRITICAL]: "\x1b[41m\x1b[37m", // Sfondo rosso, testo bianco
  [LOG_LEVELS.ERROR]: "\x1b[31m", // Rosso
  [LOG_LEVELS.WARNING]: "\x1b[33m", // Giallo
  [LOG_LEVELS.INFO]: "\x1b[36m", // Ciano
  [LOG_LEVELS.DEBUG]: "\x1b[35m", // Magenta
  [LOG_LEVELS.VERBOSE]: "\x1b[37m", // Bianco
};

/**
 * Emoji per i livelli di log
 */
export const LOG_EMOJIS = {
  [LOG_LEVELS.CRITICAL]: "🔥",
  [LOG_LEVELS.ERROR]: "❌",
  [LOG_LEVELS.WARNING]: "⚠️",
  [LOG_LEVELS.INFO]: "📋",
  [LOG_LEVELS.DEBUG]: "🔍",
  [LOG_LEVELS.VERBOSE]: "📝",
};

export default {
  LOG_LEVELS,
  LOG_LEVEL_NAMES,
  LOG_COLORS,
  LOG_EMOJIS,
};
