import { useState, useEffect } from "react";
import { Platform } from "react-native";
import { WebBlobManager } from "./FileUtils"; // Il tuo file utils

export function useWebBlob(fileName, fallbackUri) {
  const [blobUri, setBlobUri] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchBlob = async () => {
      // Se siamo su mobile, usiamo l'URI originale (file://...)
      if (Platform.OS !== "web") {
        setBlobUri(fallbackUri);
        return;
      }

      // Se siamo su Web, cerchiamo in IndexedDB tramite il nome
      if (fileName) {
        const url = await WebBlobManager.getSingle(fileName);
        if (active && url) {
          setBlobUri(url);
        }
      }
    };

    fetchBlob();

    // Cleanup: quando il componente si smonta, revochiamo l'URL per liberare RAM
    return () => {
      active = false;
      if (blobUri && Platform.OS === "web") {
        URL.revokeObjectURL(blobUri);
      }
    };
  }, [fileName]); // Si riattiva se cambia il nome file

  return blobUri;
}
