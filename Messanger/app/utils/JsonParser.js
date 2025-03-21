import axios from "axios";
import APIMethods from "./APImethods"; // Importa la classe API esistente

class JsonParser {
  // Metodo per controllare l'email e restituire "login" o "signup"
  static async emailCheckJson(email) {
    try {
      const response = await APIMethods.emailCheckAPI(email);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const emailResponse = jsonResponse["access_type"].toString();
        return emailResponse; // "login" o "signup"
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return "";
      }
    } catch (error) {
      console.error("Errore durante la verifica email:", error);
      return "";
    }
  }

  // Metodo per effettuare il signup e restituire un booleano
  static async signupJson(
    email,
    name,
    surname,
    handle,
    password,
    confirm_password
  ) {
    try {
      const response = await APIMethods.signupAPI(
        email,
        name,
        surname,
        handle,
        password,
        confirm_password
      );

      if (response.status === 200) {
        const jsonResponse = response.data;
        const signupResponse = jsonResponse["signed_up"];
        return signupResponse; // true o false
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Errore durante il signup:", error);
      return false;
    }
  }

  // Metodo per effettuare il login e restituire l'API Key
  static async loginPasswordJson(email, password) {
    try {
      const response = await APIMethods.loginPasswordAPI(email, password);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const loginResponseBool = jsonResponse["logged_in"];

        return loginResponseBool;
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Errore durante il login:", error);
      return false;
    }
  }

  // Metodo per verificare la disponibilità di un handle
  static async handleAvailability(handle) {
    try {
      const response = await APIMethods.handleAvailability(handle);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const handleAvailabilityResponse = jsonResponse["handle_available"];
        return handleAvailabilityResponse; // true o false
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Errore durante la verifica dell'handle:", error);
      return false;
    }
  }

  // Funzione per convertire una stringa JSON in una struttura dinamica
  static convertJsonToDynamicStructure(jsonString) {
    try {
      const jsonMap = JSON.parse(jsonString);
      return this._convertToDynamic(jsonMap);
    } catch (error) {
      console.error("Errore durante la conversione del JSON:", error);
      return null;
    }
  }

  // Funzione ricorsiva per navigare e convertire mappe e liste
  static _convertToDynamic(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this._convertToDynamic(item));
    } else if (value !== null && typeof value === "object") {
      return Object.keys(value).reduce((acc, key) => {
        acc[key] = this._convertToDynamic(value[key]);
        return acc;
      }, {});
    } else {
      return value;
    }
  }

  // Metodo per chiedere init all'API
  static async initJson() {
    try {
      const response = await APIMethods.initAPI();

      if (response.status === 200) {
        if (response.init) {
          console.log("Init Successo:", response);
          const { email, handle, name, surname, user_id } = response.localUser;
          await localDatabase.insertLocalUser(user_id, email, handle, name, surname);
          const localUserHandle = handle;
          console.log("Database updateLocalUser completed");

          if (response.chats == null) {
            console.log("Chat nell'init vuote, init completato con successo");
            return true;
          }

          for (const chat of response.chats) {
            const chatName = chat.name || "";
            await localDatabase.insertChat(chat.chat_id, chatName);
            console.log(
              `Database insertChat for chat_id ${chat.chat_id} completed`
            );

            for (const user of chat.users) {
              if (user.handle != localUserHandle) {
                localDatabase.insertChatAndUsers(chat.chat_id, user.handle);
                localDatabase.insertUsers(user.handle);
              }

              console.log(
                `Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${chat.chat_id} completed`
              );
            }

            for (const message of chat.messages) {
              await localDatabase.insertMessage(
                message.message_id,
                chat.chat_id,
                message.text,
                message.sender.toString(),
                message.date,
                ""
              );
              // console.log("inserimento messaggio: ", message);
            }
          }
          console.log("Init completato con successo");
          return true;
        } else {
          console.log("Server error during init");
          return false;
        }
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Errore durante l'inizializzazione:", error);
      return false;
    }
  }

  static async sendMessageJson(chat_id, text) {
    try {
      const response = await APIMethods.sendMessageAPI(chat_id, text);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const messageResponse = jsonResponse["message_sent"];
        if (messageResponse) {
          return jsonResponse;
        } else {
          return false;
        }
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Errore durante l'invio del messaggio:", error);
      return false;
    }
  }
}

export default JsonParser;
