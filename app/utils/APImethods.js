import axios from "axios";
import eventEmitter from "./EventEmitter";
import 'dotenv/config';

const path =  process.env.BRANCH === "dev" ? "/test" : "/v1";

const domain = "https://api.novyse.com";
const APIlink = domain + path
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
  async signupAPI(email, name, surname, handle, password) {
    try {
      const response = await api.get(
        `/user/auth/signup?email=${email}&name=${name}&surname=${surname}&handle=${handle}&password=${password}`
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

      return response;
    } catch (error) {
      console.error("Error in loginAPI:", error);
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
      
      response.data.comms_members_list.forEach(member => {
        if (!commsData[member.from]) {
          commsData[member.from] = {
        userData: {
          handle: member.handle,
          isSpeaking: member.is_speaking,
          webcamOn: member.webcam_on,
        },
        activeScreenShares: []
          };
        }
        
        if (member.active_screen_share) {
          commsData[member.from].activeScreenShares.push(...member.active_screen_share);
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
};

export default APIMethods;
