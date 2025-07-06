import axios from "axios";
import eventEmitter from "./EventEmitter";
import { BRANCH, API_BASE_URL } from "../../app.config.js";

const path = BRANCH === "dev" ? "/test" : "/v1";

const domain = API_BASE_URL;
const APIlink = domain + path;
const api = axios.create({
  baseURL: APIlink,
  withCredentials: true, // IMPORTANTE: Mantiene i cookie
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercetta la risposta dell'API per gli errori di autenticazione

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Non autorizzato
      eventEmitter.emit("invalidSession");
      console.error("Invalid session - 401");
    }
    return Promise.reject(error);
  }
);

const APIMethods = {
  // chiede all'API se l'email è già registrata
  async emailCheckAPI(email) {
    try {
      const response = await api.get(`/user/auth/access?email=${email}`);
      return response;
    } catch (error) {
      console.error("Error in emailCheckAPI:", error);
      throw error;
    }
  },

  // chiede registrazione all'API
  async signupAPI(
    email,
    name,
    surname,
    handle,
    password,
    privacy_policy_accepted,
    terms_of_service_accepted
  ) {
    try {
      const response = await api.get(
        `/user/auth/signup?email=${email}&name=${name}&surname=${surname}&handle=${handle}&password=${password}&privacy_policy_accepted=${privacy_policy_accepted}&terms_of_service_accepted=${terms_of_service_accepted}`
      );
      return response;
    } catch (error) {
      console.error("Error in signupAPI:", error);
      throw error;
    }
  },

  // controlla che l'handle sia disponibile
  async handleAvailability(handle) {
    try {
      const response = await api.get(
        `/user/data/check/handle-availability?handle=${handle}`
      );
      //console.log("handleAvailability in APImethods: ", response);
      return response;
    } catch (error) {
      console.error("Error in handleAvailability:", error);
      throw error;
    }
  },

  // Chiede tutto all'API (search)
  async searchAll(value) {
    try {
      const response = await api.get(`/user/data/search/all?handle=${value}`);
      console.log("searchAll in APImethods: ", response);
      return response;
    } catch (error) {
      console.error("Error in searchAll in APImethods:", error);
      throw error;
    }
  },

  // chiede il login all'API
  async loginAPI(email, password) {
    try {
      const response = await api.get(
        `/user/auth/login?email=${email}&password=${password}`
      );

      return response.data;
    } catch (error) {
      console.error("Error in loginAPI:", error);
      throw error;
    }
  },

  // chiedi all'API di generare il token per il QR Code
  async generateQRCodeTokenAPI() {
    try {
      const response = await api.get("/user/auth/qr_code/generate");

      const data = response.data;
      if (!data || !data.qr_code_generated) {
        console.error("QR Code generation failed:", data);
        return null;
      }
      return data.qr_token;
    } catch (error) {
      console.error("Error in generateQRCodeTokenAPI:", error);
      throw error;
    }
  },

  // chiede all'API di scansionare il QR Code
  async scanQRCodeAPI(qr_token) {
    try {
      const response = await api.get(
        `/user/auth/qr_code/scan?qr_token=${qr_token}`
      );
      return response.data.qr_code_scanned;
    } catch (error) {
      if (error.response && error.response.data) {
        // QR Code non valido o già scansionato
        return false;
      } else {
        // Errore di rete, timeout, o risposta completamente assente
        console.error(
          "Error in scanQRCodeAPI: Nessuna risposta dal server",
          error.message
        );
        throw error; // Rilancia l'errore per gestirlo a livello superiore
      }
    }
  },

  // chiede all'API di verificare se il token del QR Code è stato scansionato
  async checkQRCodeScannedAPI(qr_token) {
    try {
      const response = await api.get(
        `/user/auth/qr_code/check?qr_token=${qr_token}`
      );

      return response;
    } catch (error) {
      console.error("Error in checkQRCodeScannedAPI:", error);
      throw error;
    }
  },

  //chiede init all'API
  async initAPI() {
    try {
      const response = await api.get("/user/data/get/init");

      return response;
    } catch (error) {
      console.error("Error in initAPI:", error);
      throw error;
    }
  },

  // quando un messaggio viene inviato all'API, questa ritorna info utili al messaggio da salvare in locale
  async sendMessageAPI(chat_id, text) {
    try {
      // edited message to encode the URLs
      text = text
        .replace(/http:\/\//g, "http%3A%2F%2F")
        .replace(/https:\/\//g, "https%3A%2F%2F");

      const response = await api.get(
        `/chat/send/message?chat_id=${chat_id}&text=${text}`
      );
      return response;
    } catch (error) {
      console.error("Error in sendMessageAPI:", error);
      throw error;
    }
  },

  // ottiene i membri di una chat
  async getChatMembers(chat_id) {
    try {
      const response = await api.get(`/chat/get/members?chat_id=${chat_id}`);
      return response.data.members_list;
    } catch (error) {
      console.error("Error in getChatMembers API:", error);
      throw error;
    }
  },

  // effettua il logout
  async logoutAPI() {
    try {
      const response = await api.get("/user/auth/logout");
      return response.data.logged_out;
    } catch (error) {
      // if (response.status === 401) {
      //   return true;
      // } else {
      //   console.error("Error in logout API:", error);
      //   throw error;
      // }
      return true;
    }
  },

  //creazione nuova chat
  async createNewChatAPI(handle) {
    try {
      const response = await api.get(`/chat/create/chat?handle=${handle}`);
      return response.data.chat_id;
    } catch (error) {
      console.error("Error in createNewChatAPI:", error);
      throw error;
    }
  },

  //creazione gruppo
  async createNewGroupAPI(handle, name, members) {
    try {
      const response = await api.get(
        `/chat/create/group?handle=${handle}&name=${name}`
      );
      return response.data;
    } catch (error) {
      console.error("Error in createNewGroupAPI:", error);
      throw error;
    }
  },

  // join gruppo
  async joinGroup(handle) {
    try {
      const response = await api.get(`/chat/join/group?handle=${handle}`);
      return response.data;
    } catch (error) {
      console.error("Error in joinGroupAPI:", error);
      throw error;
    }
  },

  // update rispetto all'ultimo evento dal websocket
  async updateAll(date_time) {
    try {
      const response = await api.get(
        `/user/data/get/update?latest_update_datetime=${date_time}`
      );
      return response;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

  // quando uno user vuole entrare in una chat vocale
  async commsJoin(chatId) {
    try {
      const response = await api.get(`/comms/join?chat_id=${chatId}`);
      return response.data;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

  // quando uno user vuole abbandonare una chat vocale
  async commsLeave() {
    try {
      const response = await api.get(`/comms/leave`);
      return response.data;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

  // quando lo user richiede chi è in una chat vocale
  async retrieveVocalUsers(chatId) {
    try {
      const response = await api.get(`/comms/get/members?chat_id=${chatId}`);
      const commsData = {};

      response.data.comms_members_list.forEach((member) => {
        if (!commsData[member.from]) {
          commsData[member.from] = {
            userData: {
              handle: member.handle,
              isSpeaking: member.is_speaking,
              webcamOn: member.webcam_on,
            },
            activeScreenShares: [],
          };
        }

        if (member.active_screen_share) {
          commsData[member.from].activeScreenShares.push(
            ...member.active_screen_share
          );
        }
      });

      return commsData;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

  async startScreenShare(chatId) {
    try {
      const response = await api.get(
        `/comms/screen_share/start?chat_id=${chatId}`
      );
      return response.data; // ritorna screen_share_started : true/false e screen_share_uuid
    } catch (error) {
      console.error("Error in startStream:", error);
      throw error;
    }
  },

  async stopScreenShare(chatId, screenShareUUID) {
    try {
      const response = await api.get(
        `/comms/screen_share/stop?chat_id=${chatId}&screen_share_uuid=${screenShareUUID}`
      );
      return response.data; // ritorna screen_share_stopped : true/false
    } catch (error) {
      console.error("Error in stopStream:", error);
      throw error;
    }
  },

  async forgotPassword(email) {
    try {
      const response = await api.get(
        `/user/auth/forgot-password?email=${email}`
      );
      return response.data.forgot_password; // ritorna forgot_password : true/false
    } catch (error) {
      console.error("Error in forgotPassword:", error);
      throw error;
    }
  },

  async resetPassword(email, token, password) {
    try {
      const response = await api.get(
        `/user/auth/reset-password?email=${email}&token=${token}&password=${password}`
      );
      return response.data.reset_password; // ritorna reset_password : true/false
    } catch (error) {
      console.error("Error in resetPassword:", error);
      throw error;
    }
  },

  async changePassword(old_password, new_password) {
    try {
      const response = await api.get(
        `/user/auth/change-password?old_password=${old_password}&new_password=${new_password}`
      );
      return response.data.change_password; // ritorna change_password : true/false
    } catch (error) {
      console.error("Error in changePassword:", error);
      throw error;
    }
  },

  async twoFactorsAuth(method, token, code) {
    try {
      const response = await api.get(
        `/user/auth/2fa/verify?method=${method}&token=${token}&code=${code}`
      );
      return response.data; // ritorna data : token sessione e authenticated true/false
    } catch (error) {
      console.error("Error in twoFactorsAuth:", error);
      throw error;
    }
  },

  async getTwofaMethods() {
    try {
      const response = await api.get(
        `/user/auth/2fa/get`
      );
      return response.data; // ritorna data : two_fa_active_methods, two_fa_methods
    } catch (error) {
      console.error("Error in get 2fa methods:", error);
      throw error;
    }
  },

  async removeTwofaMethod(method) {
    try {
      const response = await api.get(
        `/user/auth/2fa/remove?method=${method}`
      );
      return response.data; // ritorna data : two_fa_remove_method true/false, token
    } catch (error) {
      console.error("Error in get 2fa remove method:", error);
      throw error;
    }
  },

  async addTwofaMethod(method) {
    try {
      const response = await api.get(
        `/user/auth/2fa/add?method=${method}`
      );
      return response.data; // ritorna data : two_fa_add_method true/false, token
    } catch (error) {
      console.error("Error in get 2fa remove method:", error);
      throw error;
    }
  },

  async twofaSelect(token, method) {
    try {
      const response = await api.get(
        `/user/auth/2fa/select?method=${method}&token=${token}`
      );
      return response.data; // ritorna data : two_fa_select true/false
    } catch (error) {
      console.error("Error in get twofaSelect:", error);
      throw error;
    }
  },
};

export default APIMethods;
