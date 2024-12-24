import axios from 'axios';

class APIMethods {
  static APIlink = 'https://api.messanger.bpup.israiken.it';

  static async emailCheckAPI(email) {
    const url = `${this.APIlink}/user/action/access?email=${email}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in emailCheckAPI:", error);
      throw error;
    }
  }

  static async signupAPI(email, name, surname, handle, password, confirm_password) {
    const url = `${this.APIlink}/user/action/signup?email=${email}&name=${name}&surname=${surname}&handle=${handle}&password=${password}&confirm_password=${confirm_password}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in signupAPI:", error);
      throw error;
    }
  }

  static async handleAvailability(handle) {
    const url = `${this.APIlink}/user/action/check-handle-availability?handle=${handle}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in handleAvailability:", error);
      throw error;
    }
  }

  static async loginPasswordAPI(email, password) {
    const url = `${this.APIlink}/user/action/login?email=${email}&password=${password}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in loginPasswordAPI:", error);
      throw error;
    }
  }

  static async getUserID(apiKey) {
    const url = `${this.APIlink}/user/action/get-user-id?api_key=${apiKey}`;
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      console.error("Error in getUserID:", error);
      throw error;
    }
  }
}

export default APIMethods;
