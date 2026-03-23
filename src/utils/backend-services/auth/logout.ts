import axios from "axios";
import { API_LINK } from "../config";

export const logout = async (): Promise<boolean> => {
  try {
    const headers: Record<string, string> = {};

    let url = `${API_LINK}/auth/logout`;

    const response = await axios.post(url, null, {
      headers,
      withCredentials: true,
    });

    if (response.data.success) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error logging out:", error);
    return false;
  }
};
