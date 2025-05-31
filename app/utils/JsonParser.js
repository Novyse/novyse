import APIMethods from "./APImethods"; // Importa la classe API esistente
import localDatabase from "../utils/localDatabaseMethods";
import eventEmitter from "../utils/EventEmitter";
import WebSocketMethods from "./webSocketMethods";

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
  static async signupJson(email, name, surname, handle, password) {
    try {
      const response = await APIMethods.signupAPI(
        email,
        name,
        surname,
        handle,
        password
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
        const loginResponseToken = jsonResponse["token"];

        return loginResponseToken;
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

  // Metodo per cercare qualsiasi cosa nell'app
  static async searchAll(value) {
    try {
      const response = await APIMethods.searchAll(value);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const searchAllResponse = jsonResponse["searched_list"];
        return searchAllResponse;
      } else {
        console.error(`Errore nella richiesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
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
        const data = response.data;
        if (data.init) {
          console.log("🟢Init Successo:", data);

          await WebSocketMethods.UpdateLastWebSocketActionDateTime(data.date);

          const { email, handle, name, surname, user_id } = data.localUser;
          await localDatabase.insertLocalUser(
            user_id,
            email,
            handle,
            name,
            surname
          );
          const localUserHandle = handle;
          console.log("Database updateLocalUser completed");

          // controllo se l'init contiene chat e gruppi
          if (data.chats == null && data.groups == null) {
            console.log(
              "Chat e gruppi nell'init vuoti, init completato con successo"
            );
            return true;
          }

          // inserisco le chat
          if (data.chats) {
            for (const chat of data.chats) {
              const chatName = chat.name || "";
              await localDatabase.insertChat(chat.chat_id, chatName);
              console.log(
                `Database insertChat for chat_id ${chat.chat_id} completed`
              );

              for (const user of chat.users) {
                if (user.handle != localUserHandle) {
                  await localDatabase.insertChatAndUsers(
                    chat.chat_id,
                    user.handle
                  );
                  await localDatabase.insertUsers(user.handle);
                }

                console.log(
                  `Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${chat.chat_id} completed`
                );
              }

              if (chat.messages == null) {
                console.log("Messaggi nella chat vuoti");
              } else {
                for (const message of chat.messages) {
                  await localDatabase.insertMessage(
                    message.message_id,
                    chat.chat_id,
                    message.text,
                    message.sender,
                    message.date
                  );
                }
              }
            }
          }

          // inserisco i gruppi
          if (data.groups) {
            for (const group of data.groups) {
              const groupName = group.name || "";
              await localDatabase.insertChat(group.chat_id, groupName);
              console.log(
                `Database insertChat for chat_id ${group.chat_id} completed`
              );

              for (const user of group.users) {
                if (user.handle != localUserHandle) {
                  await localDatabase.insertChatAndUsers(
                    group.chat_id,
                    user.handle
                  );
                  await localDatabase.insertUsers(user.handle);
                }

                console.log(
                  `Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${group.chat_id} completed`
                );
              }

              if (group.messages == null) {
                console.log("Messaggi nel gruppo vuoti");
              } else {
                for (const message of group.messages) {
                  await localDatabase.insertMessage(
                    message.message_id,
                    group.chat_id,
                    message.text,
                    message.sender,
                    message.date
                  );
                }
              }
            }
          }

          console.log("🟢 Init completato con successo");
          return true;
        } else {
          console.log("Server error during init");
          return false;
        }
      } else {
        console.error(`Errore nella richiesta: ${data.status}`);
        return false;
      }
    } catch (error) {
      console.error("Errore durante l'inizializzazione:", error);
      return false;
    }
  }

  // Update
  static async updateAll(date_time) {
    try {
      const response = await APIMethods.updateAll(date_time);

      if (response.status === 200) {
        const data = response.data;
        if (data.update) {
          console.log("🟢 Update Successo:", data);

          // controllo se l'init contiene chat e gruppi
          if (data.chats == null && data.groups == null) {
            console.log(
              "Chat e gruppi nell'update vuoti, update completato con successo"
            );
            return true;
          }
          const localUserHandle = await localDatabase.fetchLocalUserHandle();
          // inserisco le chat
          if (data.chats) {
            for (const chat of data.chats) {
              const chatName = chat.name || "";
              await localDatabase.insertChat(chat.chat_id, chatName);
              console.log(
                `Database insertChat for chat_id ${chat.chat_id} completed`
              );

              for (const user of chat.users) {
                if (user.handle != localUserHandle) {
                  await localDatabase.insertChatAndUsers(
                    chat.chat_id,
                    user.handle
                  );
                  await localDatabase.insertUsers(user.handle);
                }

                console.log(
                  `Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${chat.chat_id} completed`
                );
              }

              if (chat.messages == null) {
                console.log("Messaggi nella chat vuoti");
              } else {
                for (const message of chat.messages) {
                  await localDatabase.insertMessage(
                    message.message_id,
                    chat.chat_id,
                    message.text,
                    message.sender,
                    message.date
                  );
                }
              }
            }
          }

          // inserisco i gruppi
          if (data.groups) {
            for (const group of data.groups) {
              const groupName = group.name || "";
              await localDatabase.insertChat(group.chat_id, groupName);
              console.log(
                `Database insertChat for chat_id ${group.chat_id} completed`
              );

              for (const user of group.users) {
                if (user.handle != localUserHandle) {
                  await localDatabase.insertChatAndUsers(
                    group.chat_id,
                    user.handle
                  );
                  await localDatabase.insertUsers(user.handle);
                }

                console.log(
                  `Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${group.chat_id} completed`
                );
              }

              if (group.messages == null) {
                console.log("Messaggi nel gruppo vuoti");
              } else {
                for (const message of group.messages) {
                  await localDatabase.insertMessage(
                    message.message_id,
                    group.chat_id,
                    message.text,
                    message.sender,
                    message.date
                  );
                }
              }
            }
          }

          console.log("🟢 Update completato con successo");
          return true;
        } else {
          console.log("Server error during init");
          throw error;
        }
      } else {
        console.error(`Errore nella richiesta: ${data.status}`);
        throw error;
      }
    } catch (error) {
      console.error("Errore durante l'inizializzazione:", error);
      throw error;
    }
  }

  // quando mando un messaggio aspetto che ritorni le info
  static async sendMessageJson(chat_id, text, randomNumberPlusDate) {
    try {
      const response = await APIMethods.sendMessageAPI(chat_id, text);

      if (response.status === 200) {
        const jsonResponse = response.data;
        const messageResponse = jsonResponse["message_sent"];
        if (messageResponse) {
          await localDatabase.insertMessage(
            jsonResponse.message_id,
            jsonResponse.chat_id,
            jsonResponse.text,
            jsonResponse.sender,
            jsonResponse.date
          );

          const data = {
            chat_id: jsonResponse.chat_id,
            text: jsonResponse.text,
            date: jsonResponse.date,
            message_id: jsonResponse.message_id,
            hash: randomNumberPlusDate,
            sender: jsonResponse.sender,
          };
          eventEmitter.emit("updateMessage", data);
          eventEmitter.emit("updateNewLastMessage", data);
          return true;
        }
        return false;
      }
      return false;
    } catch (error) {
      console.error("Errore durante l'invio del messaggio:", error);
      return false;
    }
  }
}

export default JsonParser;
