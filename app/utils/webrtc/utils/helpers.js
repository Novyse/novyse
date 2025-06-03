
import logger from '../logging/WebRTCLogger.js';

/**
 * Utility functions per WebRTC
 */

/**
 * Verifica se una connessione peer è in uno stato "sano"
 */
export function isConnectionHealthy(peerConnection) {
  if (!peerConnection) return false;
  
  const iceState = peerConnection.iceConnectionState;
  const connState = peerConnection.connectionState;
  
  return (
    (iceState === 'connected' || iceState === 'completed') &&
    (connState === 'connected' || connState === 'connecting')
  );
}

/**
 * Verifica se una connessione peer è fallita
 */
export function isConnectionFailed(peerConnection) {
  if (!peerConnection) return true;
  
  const iceState = peerConnection.iceConnectionState;
  const connState = peerConnection.connectionState;
  
  return (
    iceState === 'failed' ||
    connState === 'failed' ||
    connState === 'closed'
  );
}

/**
 * Ottieni informazioni dettagliate su una peer connection
 */
export function getPeerConnectionInfo(peerConnection, participantId = 'unknown') {
  if (!peerConnection) {
    return {
      participantId,
      exists: false,
      error: 'PeerConnection not found'
    };
  }

  try {
    return {
      participantId,
      exists: true,
      iceConnectionState: peerConnection.iceConnectionState,
      connectionState: peerConnection.connectionState,
      signalingState: peerConnection.signalingState,
      iceGatheringState: peerConnection.iceGatheringState,
      localDescription: {
        type: peerConnection.localDescription?.type || null,
        hasSessionDescription: !!peerConnection.localDescription
      },
      remoteDescription: {
        type: peerConnection.remoteDescription?.type || null,
        hasSessionDescription: !!peerConnection.remoteDescription
      },
      senders: peerConnection.getSenders?.()?.length || 0,
      receivers: peerConnection.getReceivers?.()?.length || 0,
      isHealthy: isConnectionHealthy(peerConnection),
      isFailed: isConnectionFailed(peerConnection)
    };
  } catch (error) {
    logger.error('Helpers', `Errore ottenendo info peer connection per ${participantId}:`, error);
    return {
      participantId,
      exists: true,
      error: error.message
    };
  }
}

/**
 * Valida un ICE candidate
 */
export function validateIceCandidate(candidate) {
  if (!candidate) return false;
  
  return !!(
    candidate.candidate &&
    typeof candidate.sdpMLineIndex === 'number' &&
    candidate.sdpMid
  );
}

/**
 * Valida una session description (offer/answer)
 */
export function validateSessionDescription(description) {
  if (!description) return false;
  
  return !!(
    description.type &&
    description.sdp &&
    (description.type === 'offer' || description.type === 'answer')
  );
}

/**
 * Calcola il delay per exponential backoff
 */
export function calculateExponentialBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  // Aggiungi un po' di jitter per evitare thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Aspetta per un determinato tempo
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Timeout wrapper per promesse
 */
export function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * Retry wrapper per operazioni che possono fallire
 */
export async function withRetry(operation, maxAttempts = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delay = calculateExponentialBackoff(attempt, baseDelay);
      logger.warning('Helpers', `Tentativo ${attempt}/${maxAttempts} fallito, retry in ${delay}ms:`, error.message);
      await wait(delay);
    }
  }
  
  throw lastError;
}

/**
 * Pulisce le tracce di un MediaStream
 */
export function cleanupMediaStream(stream, logContext = 'unknown') {
  if (!stream) return;
  
  try {
    const tracks = stream.getTracks();
    logger.debug('Helpers', `Pulizia ${tracks.length} tracce per ${logContext}`);
    
    tracks.forEach(track => {
      try {
        track.stop();
        stream.removeTrack(track);
      } catch (error) {
        logger.warning('Helpers', `Errore fermando traccia per ${logContext}:`, error);
      }
    });
  } catch (error) {
    logger.error('Helpers', `Errore pulizia stream per ${logContext}:`, error);
  }
}

/**
 * Formatta bytes in formato leggibile
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formatta durata in formato leggibile
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Throttle function per limitare la frequenza di chiamate
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce function per ritardare l'esecuzione
 */
export function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Verifica se un oggetto è vuoto
 */
export function isEmpty(obj) {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
}

/**
 * Deep clone di un oggetto (limitato per oggetti semplici)
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === "object") {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

export default {
  isConnectionHealthy,
  isConnectionFailed,
  getPeerConnectionInfo,
  validateIceCandidate,
  validateSessionDescription,
  calculateExponentialBackoff,
  wait,
  withTimeout,
  withRetry,
  cleanupMediaStream,
  formatBytes,
  formatDuration,
  throttle,
  debounce,
  isEmpty,
  deepClone
};
