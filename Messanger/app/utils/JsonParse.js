import axios from 'axios';
import APIMethods from './APImethods'; // Importa la classe API esistente

class JsonParser {
  // Metodo per controllare l'email e restituire "login" o "signup"
  static async emailCheckJson(email) {
    try {
      const response = await APIMethods.emailCheckAPI(email);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const emailResponse = jsonResponse['accessType'].toString();
        return emailResponse; // "login" o "signup"
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return '';
      }
    } catch (error) {
      console.error('Errore durante la verifica email:', error);
      return '';
    }
  }

  // Metodo per effettuare il signup e restituire un booleano
  static async signupJson(email, name, surname, handle, password, confirm_password) {
    try {
      const response = await APIMethods.signupAPI(email, name, surname, handle, password, confirm_password);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const signupResponse = jsonResponse['signedUp'];
        return signupResponse; // true o false
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('Errore durante il signup:', error);
      return false;
    }
  }

  // Metodo per effettuare il login e restituire l'API Key
  static async loginPasswordJson(email, password) {
    try {
      const response = await APIMethods.loginPasswordAPI(email, password);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const loginResponse = jsonResponse['api_key'].toString();
        return loginResponse; // API Key
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return '';
      }
    } catch (error) {
      console.error('Errore durante il login:', error);
      return '';
    }
  }

  // Metodo per verificare la disponibilità di un handle
  static async handleAvailability(handle) {
    try {
      const response = await APIMethods.handleAvailability(handle);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const handleAvailabilityResponse = jsonResponse['handle_available'];
        return handleAvailabilityResponse; // true o false
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('Errore durante la verifica dell\'handle:', error);
      return false;
    }
  }

  // Metodo per ottenere l'ID utente
  static async getUserID(apiKey) {
    try {
      const response = await APIMethods.getUserID(apiKey);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const userIDResponse = jsonResponse['user_id'].toString();
        return userIDResponse; // User ID
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return '';
      }
    } catch (error) {
      console.error('Errore durante l\'ottenimento dell\'ID utente:', error);
      return '';
    }
  }

  // Funzione per convertire una stringa JSON in una struttura dinamica
  static convertJsonToDynamicStructure(jsonString) {
    try {
      const jsonMap = JSON.parse(jsonString);
      return this._convertToDynamic(jsonMap);
    } catch (error) {
      console.error('Errore durante la conversione del JSON:', error);
      return null;
    }
  }

  // Funzione ricorsiva per navigare e convertire mappe e liste
  static _convertToDynamic(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this._convertToDynamic(item));
    } else if (value !== null && typeof value === 'object') {
      return Object.keys(value).reduce((acc, key) => {
        acc[key] = this._convertToDynamic(value[key]);
        return acc;
      }, {});
    } else {
      return value;
    }
  }
}

export default JsonParser;
