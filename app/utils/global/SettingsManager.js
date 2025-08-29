import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@app_settings';

class SettingsManager {
  constructor() {
    this.defaultSettings = {
      lastUpdated: null,
      settings: {
        comms: {
          microphone: "DEFAULT",
          webcam: "DEFAULT",
          entryMode: "AUDIO_ONLY", // OFF, AUDIO_ONLY, VIDEO_ONLY, BOTH

          webcamQuality: "HD", // HD, FULL_HD, 2K, 4K
          webcamFPS: 30, // from 1 to 120

          screenShareQuality: "HD", // HD, FULL_HD, 2K, 4K
          screenShareFPS: 30, // from 1 to 120
          screenShareAudio: false, // true, false

          noiseSuppressionLevel: "MEDIUM", // OFF, LOW, MEDIUM, HIGH
          expanderLevel: "MEDIUM", // OFF, LOW, MEDIUM, HIGH
          noiseGateType: "ADAPTIVE", // OFF, MANUAL, HYBRYD, ADAPTIVE
          noiseGateThreshold: -20, // ONLY IF TYPE = MANUAL | HYBRYD
          typingAttenuationLevel: "MEDIUM", // OFF, LOW, MEDIUM, HIGH


        }
      }
    };
  }

  /**
   * Carica le intere impostazioni da AsyncStorage
   * @returns {Object} Le impostazioni complete
   */
  async loadSettings() {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Merge con le impostazioni di default per aggiungere eventuali nuove chiavi
        return this._mergeWithDefaults(parsed);
      }
      
      // Se non ci sono impostazioni salvate, usa quelle di default
      const defaultWithTimestamp = {
        ...this.defaultSettings,
        lastUpdated: new Date().toISOString()
      };
      
      await this.saveSettings(defaultWithTimestamp);
      return defaultWithTimestamp;
      
    } catch (error) {
      console.error('SettingsManager: Error loading settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Salva le intere impostazioni in AsyncStorage
   * @param {Object} settings - Le impostazioni da salvare
   * @returns {boolean} Successo dell'operazione
   */
  async saveSettings(settings) {
    try {
      const settingsWithTimestamp = {
        ...settings,
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsWithTimestamp, null, 2));
      return true;
    } catch (error) {
      console.error('SettingsManager: Error saving settings:', error);
      return false;
    }
  }

  /**
   * Prende un singolo parametro usando path notation
   * @param {string} path - Percorso del parametro (es: "settings.vocalChat.noiseSuppressionLevel")
   * @returns {any} Il valore del parametro
   */
  async getSingleParameter(path) {
    try {
      const settings = await this.loadSettings();
      return this._getValueByPath(settings, path);
    } catch (error) {
      console.error('SettingsManager: Error getting single parameter:', error);
      return this._getValueByPath(this.defaultSettings, path);
    }
  }

  /**
   * Prende tutti i parametri di vocalChat
   * @param {string} pagePath - Percorso della pagina (default: "settings.vocalChat")
   * @returns {Object} I parametri della pagina vocalChat
   */
   async getPageParameters(pagePath) {
    try {
      const settings = await this.loadSettings();
      const pageSettings = this._getValueByPath(settings, pagePath);
      
      if (typeof pageSettings === 'object' && pageSettings !== null) {
        return pageSettings;
      }
      
      // Fallback ai default
      return this._getValueByPath(this.defaultSettings, pagePath) || {};
    } catch (error) {
      console.error('SettingsManager: Error getting page parameters:', error);
      return this._getValueByPath(this.defaultSettings, pagePath) || {};
    }
  }

  /**
   * Modifica un singolo parametro
   * @param {string} path - Percorso del parametro (es: "settings.vocalChat.noiseSuppressionLevel")
   * @param {any} value - Nuovo valore
   * @returns {boolean} Successo dell'operazione
   */
  async setSingleParameter(path, value) {
    try {
      const settings = await this.loadSettings();
      const updatedSettings = this._setValueByPath(settings, path, value);
      return await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('SettingsManager: Error setting single parameter:', error);
      return false;
    }
  }

  /**
   * Reset delle impostazioni vocalChat ai valori di default
   * @returns {boolean} Successo dell'operazione
   */
  async resetVocalChatSettings() {
    try {
      const settings = await this.loadSettings();
      const defaultVocalChat = this.defaultSettings.settings.vocalChat;
      
      const updatedSettings = this._setValueByPath(settings, 'settings.vocalChat', defaultVocalChat);
      return await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('SettingsManager: Error resetting vocalChat settings:', error);
      return false;
    }
  }

  // Metodi privati di utilità

  _getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  _setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    // Crea una copia profonda dell'oggetto
    const result = JSON.parse(JSON.stringify(obj));
    
    // Naviga fino al livello padre
    let current = result;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Imposta il valore
    current[lastKey] = value;
    
    return result;
  }

  _mergeWithDefaults(savedSettings) {
    const merge = (target, source) => {
      const result = { ...target };
      
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = merge(target[key] || {}, source[key]);
        } else if (target[key] === undefined) {
          result[key] = source[key];
        }
      }
      
      return result;
    };
    
    return merge(savedSettings, this.defaultSettings);
  }
}

// Esporta un'istanza singleton
export const settingsManager = new SettingsManager();
export default settingsManager;