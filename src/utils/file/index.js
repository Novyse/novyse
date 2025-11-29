import { Platform } from "react-native";
// Importiamo FileSystem solo se serve, ma su Web Expo lo gestisce ignorandolo o usiamo controlli
import * as FileSystem from "expo-file-system";

// --- 1. LOGICA PRIVATA DATABASE (IndexedDB per Web) ---
const DB_CONFIG = { name: "MyWebAssets", store: "blobs", version: 1 };

const _getWebDB = () => {
  if (Platform.OS !== "web") return null; // Sicurezza
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    req.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains(DB_CONFIG.store)) {
        e.target.result.createObjectStore(DB_CONFIG.store, { keyPath: "name" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e);
  });
};

// --- 2. EXPORT: LE TUE UTILITY (Potenziate) ---

/**
 * Estrae il nome del file dall'URI.
 */
export function getName(uri) {
  if (!uri) return "";
  // Rimuove eventuali query params se presenti
  const cleanUri = uri.split("?")[0];
  return cleanUri.split("/").pop();
}

/**
 * Ottiene la dimensione in byte.
 * Su Web: Funziona sia con URL remoti (http) che locali (blob:)
 */
export async function getSize(uri) {
  if (Platform.OS === "web") {
    try {
      // Fetch su web è molto ottimizzato, legge solo gli header se possibile o lo stream
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (e) {
      console.warn("Errore get size web:", e);
      return 0;
    }
  } else {
    // Fallback Mobile (come da tuo codice)
    const info = await FileSystem.getInfoAsync(uri);
    return info.size || 0;
  }
}

// --- 3. EXPORT: GESTIONE PERSISTENZA WEB ---

export const WebBlobManager = {
  /**
   * Scarica un file remoto, lo converte in Blob e lo salva in IndexedDB.
   * Ritorna l'oggetto file salvato con URL visualizzabile.
   */
  save: async (uri, customName = null) => {
    if (Platform.OS !== "web") return null;

    try {
      // 1. Fetch del BLOB temporaneo (dalla RAM del browser)
      const response = await fetch(uri);
      const blob = await response.blob();

      // Se non passiamo un nome, proviamo a indovinarlo, altrimenti usiamo quello passato
      const fileName = customName || getName(uri) || `file_${Date.now()}`;

      const db = await _getWebDB();

      // 2. Salvataggio nel Database Persistente
      await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_CONFIG.store, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);

        tx.objectStore(DB_CONFIG.store).put({
          name: fileName,
          blob: blob,
          size: blob.size,
          type: blob.type, // Salviamo il tipo MIME (es. audio/webm)
          created: Date.now(),
        });
      });

      console.log(`[WebDB] Persistito: ${fileName}`);

      // 3. Ritorniamo subito i dati utili per la UI senza dover rifare fetchAll
      // Creiamo un URL fresco che punta al DB (non più alla RAM volatile della registrazione)

      const finalUri = URL.createObjectURL(blob);
      console.log(".............", finalUri);

      return {
        name: fileName,
        uri: finalUri,
        size: blob.size,
        type: blob.type,
      };
    } catch (error) {
      console.error("[WebDB] Errore salvataggio:", error);
      throw error;
    }
  },

  
  getSingle: async (fileName) => {
    if (Platform.OS !== "web") return null;
    const db = await _getWebDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_CONFIG.store, "readonly");
      const req = tx.objectStore(DB_CONFIG.store).get(fileName); // Cerca per chiave (nome)

      req.onsuccess = () => {
        const record = req.result;
        if (record) {
          // Generiamo un NUOVO url fresco per questa sessione
          resolve(URL.createObjectURL(record.blob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  },

  /**
   * Recupera tutti i file salvati e crea URL temporanei (blob:http://...)
   * pronti per essere visualizzati in <Image> o <Audio>.
   */
  fetchAll: async () => {
    if (Platform.OS !== "web") return [];

    const db = await _getWebDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_CONFIG.store, "readonly");
      const request = tx.objectStore(DB_CONFIG.store).getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        // Trasformiamo i dati grezzi in oggetti utili per la UI
        const uiFiles = results.map((item) => ({
          name: item.name,
          // Creiamo l'URL "finto" che punta alla RAM del browser
          uri: URL.createObjectURL(item.blob),
          size: item.size, // Abbiamo già la size salvata!
          type: item.type,
        }));
        resolve(uiFiles);
      };
    });
  },

  /**
   * Cancella un file dal DB e libera la memoria.
   */
  delete: async (fileName) => {
    if (Platform.OS !== "web") return;
    const db = await _getWebDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_CONFIG.store, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
      tx.objectStore(DB_CONFIG.store).delete(fileName);
    });
  },
};
