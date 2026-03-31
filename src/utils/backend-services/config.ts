import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BRANCH, API_BASE_URL } from "../../../app.config";

// Opaque specific
export const OPAQUE_SERVER_IDENTITY = "novyse-auth-service";

export const API_LINK = API_BASE_URL + "/" + BRANCH;

export const authApi = axios.create({
  baseURL: API_LINK,
  timeout: 10000,
});

authApi.interceptors.request.use(
  (config) => {
    if (BRANCH !== "production") {
      console.log(
        `[Auth API] Request: ${config.method?.toUpperCase()} ${config.url}`,
        config.data || "",
      );
    }
    return config;
  },
  (error) => {
    console.error(`[Auth API] Request Error:`, error);
    return Promise.reject(error);
  },
);

authApi.interceptors.response.use(
  async (response) => {
    if (Platform.OS !== "web") {
      const newSessionId = response.headers["x-set-session-id"];
      if (newSessionId) {
        await SecureStore.setItemAsync("sessionId", String(newSessionId));
      }
    }

    if (BRANCH !== "production") {
      console.log(
        `[Auth API] Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.data || "",
      );
    }
    return response;
  },
  (error) => {
    if (BRANCH !== "production") {
      console.error(
        `[Auth API] Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        error.response?.data || error.message,
      );
    }
    return Promise.reject(error);
  },
);
