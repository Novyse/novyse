import axios from "axios";
import { API_LINK } from "../config";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Fetches a new access token (JWT) from the backend.
 * Uses the session cookie (__novyse_session) on Web or sessionId in SecureStore on Mobile.
 */
export const fetchToken = async (): Promise<string | null> => {
  try {
    const headers: Record<string, string> = {};

    let url = `${API_LINK}/auth/token`;

    if (Platform.OS !== "web") {
      const sessionId = await SecureStore.getItemAsync("sessionId");
      if (sessionId) {
        headers["x-session-id"] = sessionId;
      }
    }

    const response = await axios.post(url, null, {
      headers,
      withCredentials: true,
    });

    if (response.data.success) {
      return response.data.token;
    }
    return null;
  } catch (error) {
    console.error("Error fetching token:", error);
    return null;
  }
};
