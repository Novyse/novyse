import axios from 'axios';

class APIMethods {
  static APIlink = 'https://api.messanger.bpup.israiken.it';


  //controlla se l'email è già registrata
  static async emailCheckAPI(email) {
    const url = `${this.APIlink}/user/auth/access?email=${email}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in emailCheckAPI:", error);
      throw error;
    }
  }


  // chiede registrazione all'API
  static async signupAPI(email, name, surname, handle, password, confirm_password) {
    const url = `${this.APIlink}/user/auth/signup?email=${email}&name=${name}&surname=${surname}&handle=${handle}&password=${password}&confirm_password=${confirm_password}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in signupAPI:", error);
      throw error;
    }
  }


  // controlla che l'handle sia disponibile
  static async handleAvailability(handle) {
    const url = `${this.APIlink}/user/data/check/handle-availability?handle=${handle}`;
    try {
      const response = await axios.get(url);
      console.log("handleAvailability in APImethods: ", response);
      return response;
    } catch (error) {
      console.error("Error in handleAvailability:", error);
      throw error;
    }
  }


  // chiede il login all'API
  static async loginPasswordAPI(email, password) {
    const url = `${this.APIlink}/user/auth/login?email=${email}&password=${password}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in loginPasswordAPI:", error);
      throw error;
    }
  }

  
  //chiede init all'API
  static async initAPI() {
    const url = `${this.APIlink}/user/data/get/init`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in initAPI:", error);
      throw error;
    }
  }


  // quando un messaggio viene inviato all'API, questa ritorna info utili al messaggio da salvare in locale
  static async sendMessageAPI(chat_id, text) {
    const url = `${this.APIlink}/user/data/send/message?chat_id=${chat_id}&text=${text}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in sendMessageAPI:", error);
      throw error;
    }
  }
}

export default APIMethods;
