import { Platform } from "react-native";

import axios from "axios";
axios.defaults.withCredentials = true;

class APIMethods {
  static domain = "https://api.messanger.bpup.israiken.it";
  static APIlink = this.domain + "/v1";

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
        `/user/data/send/message?chat_id=${chat_id}&text=${text}`
      );
      return response;
    } catch (error) {
      console.error("Error in sendMessageAPI:", error);
      throw error;
    }
  }
}

export default APIMethods;
