import { authApi } from "@/src/utils/backend-services/config";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import InternalPlatform from "@/src/utils/device/type";

/**
 * Fetches a new access token (JWT) from the backend.
 * Uses the session cookie (__novyse_session) on Web or sessionId in SecureStore on Mobile.
 */
export const fetchToken = async (): Promise<string | null> => {
  try {
    const headers: Record<string, string> = {
      "x-platform": InternalPlatform,
    };

    if (Platform.OS !== "web") {
      const sessionId = await SecureStore.getItemAsync("sessionId");
      if (sessionId) {
        headers["x-session-id"] = sessionId;
      }
    }

    const response = await authApi.post("/token", null, {
      headers,
      withCredentials: true,
    });

    if (response.data.success) {
      if (Platform.OS !== "web" && response.data.sessionId) {
        await SecureStore.setItemAsync(
          "sessionId",
          String(response.data.sessionId),
        );
      }
      return response.data.token;
    }
    return null;
  } catch (error) {
    console.error("Error fetching token:", error);
    return null;
  }
};
