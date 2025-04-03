import axios from "axios";
axios.defaults.withCredentials = true;

class APIMethods {
  static domain = "https://api.buzz.israiken.it";
  static APIlink = this.domain + "/test";

  static api = axios.create({
    baseURL: this.APIlink,
    withCredentials: true, // IMPORTANTE: Mantiene i cookie
  });

  //controlla se l'email è già registrata
  static async emailCheckAPI(email) {
    try {
      const response = await this.api.get(`/user/auth/access?email=${email}`);
      return response;
    } catch (error) {
      console.error("Error in emailCheckAPI:", error);
      throw error;
    }
  }

  // chiede registrazione all'API
  static async signupAPI(
    email,
    name,
    surname,
    handle,
    password,
    confirm_password
  ) {
    try {
      const response = await this.api.get(
        `/user/auth/signup?email=${email}&name=${name}&surname=${surname}&handle=${handle}&password=${password}&confirm_password=${confirm_password}`
      );
      return response;
    } catch (error) {
      console.error("Error in signupAPI:", error);
      throw error;
    }
  }

  // controlla che l'handle sia disponibile
  static async handleAvailability(handle) {
    try {
      const response = await this.api.get(
        `/user/data/check/handle-availability?handle=${handle}`
      );
      console.log("handleAvailability in APImethods: ", response);
      return response;
    } catch (error) {
      console.error("Error in handleAvailability:", error);
      throw error;
    }
  }

  // Chiede tutto all'API (search)
  static async searchAll(value) {
    try {
      const response = await this.api.get(
        `/user/data/search/all?handle=${value}`
      );
      console.log("searchAll in APImethods: ", response);
      return response;
    } catch (error) {
      console.error("Error in searchAll in APImethods:", error);
      throw error;
    }
  }

  // chiede il login all'API
  static async loginPasswordAPI(email, password) {
    try {
      const response = await this.api.get(
        `/user/auth/login?email=${email}&password=${password}`
      );

      return response;
    } catch (error) {
      console.error("Error in loginPasswordAPI:", error);
      throw error;
    }
  }

  //chiede init all'API
  static async initAPI() {
    try {
      const response = await this.api.get("/user/data/get/init");

      return response;
    } catch (error) {
      console.error("Error in initAPI:", error);
      throw error;
    }
  }

  // quando un messaggio viene inviato all'API, questa ritorna info utili al messaggio da salvare in locale
  static async sendMessageAPI(chat_id, text) {
    try {
      const response = await this.api.get(
        `/chat/send/message?chat_id=${chat_id}&text=${text}`
      );
      return response;
    } catch (error) {
      console.error("Error in sendMessageAPI:", error);
      throw error;
    }
  }

  static async getChatMembers(chat_id) {
    try {
      const response = await this.api.get(
        `/chat/get/members?chat_id=${chat_id}`
      );
      return response.data.members_list;
    } catch (error) {
      console.error("Error in getChatMembers API:", error);
      throw error;
    }
  }

  static async logoutAPI() {
    try {
      const response = await this.api.get("/user/auth/logout");
      return response.data.logged_out;
    } catch (error) {
      console.error("Error in logout API:", error);
      throw error;
    }
  }

  //creazione nuova chat
  static async createNewChatAPI(handle) {
    try {
      const response = await this.api.get(`/chat/create/chat?handle=${handle}`);
      return response.data.chat_id;
    } catch (error) {
      console.error("Error in createNewChatAPI:", error);
      throw error;
    }
  }

  //creazione gruppo
  static async createNewGroupAPI(handle, name, members) {
    try {
      const response = await this.api.get(
        `/chat/create/group?handle=${handle}&name=${name}`
      );
      return response.data;
    } catch (error) {
      console.error("Error in createNewGroupAPI:", error);
      throw error;
    }
  }

  // join gruppo
  static async joinGroup(handle) {
    try {
      const response = await this.api.get(
        `/chat/join/group?handle=${handle}`
      );
      return response.data;
    } catch (error) {
      console.error("Error in joinGroupAPI:", error);
      throw error;
    }
  }

  // update di tutto
  static async updateAll(date_time) {
    try {
      const response = await this.api.get(
        `/user/data/get/update?latest_update_datetime=${date_time}`
      );
      return response;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  }


}

export default APIMethods;
