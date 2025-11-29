import { FileSystem } from 'expo-file-system';

class FileInfo {
  constructor(uri) {
    this.uri = uri;
  }

  async getSize() {
    const info = await FileSystem.getInfoAsync(this.uri);
    return info.size;
  }

  getName() {
    return this.uri.split('/').pop();
  }

  async getMimeType() {
    try {
      // Leggi i primi 12 byte del file come base64
      const base64Header = await FileSystem.readAsStringAsync(this.uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 12,
      });
      // Decodifica base64 a string
      const header = atob(base64Header);
      // Ottieni i byte
      const bytes = [];
      for (let i = 0; i < header.length; i++) {
        bytes.push(header.charCodeAt(i));
      }
      // Rileva MIME basato sui magic numbers
      if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) {
        return 'image/jpeg';
      }
      if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return 'image/png';
      }
      if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return 'image/gif';
      }
      if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
        return 'audio/mpeg'; // MP3 con ID3
      }
      if (bytes.length >= 2 && bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
        return 'audio/mpeg'; // MP3 senza ID3
      }
      if (bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x74 && bytes[2] === 0x79 && bytes[3] === 0x70) {
        return 'video/mp4'; // MP4
      }
      if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return 'application/pdf';
      }
      // Aggiungi altri controlli se necessario
      return 'application/octet-stream';
    } catch (error) {
      // In caso di errore, fallback all'estensione
      const ext = this.uri.split('.').pop().toLowerCase();
      const mimeMap = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        mp4: 'video/mp4',
        pdf: 'application/pdf',
        txt: 'text/plain',
        json: 'application/json',
      };
      return mimeMap[ext] || 'application/octet-stream';
    }
  }
}

export default FileInfo;
