import { authApi } from "@/src/utils/backend-services/config";
import * as SecureStore from "expo-secure-store";
import Platform from "@/src/utils/device/type";
import { secureStoreRpc } from "@/src/utils/electron/secureStore";

/**
 * Fetches a new access token (JWT) from the backend.
 * Uses the session cookie (__novyse_session) on Web or sessionId in SecureStore on Mobile.
 */
export const fetchToken = async (): Promise<string | null> => {
  try {
    const headers: Record<string, string> = {
      "x-platform": Platform,
    };

    switch (Platform) {
      case "desktop": {
        const sessionId = await secureStoreRpc.get("sessionId");
        if (sessionId) {
          headers["x-session-id"] = sessionId;
        }
        break;
      }
      case "mobile": {
        const sessionId = await SecureStore.getItemAsync("sessionId");
        if (sessionId) {
          headers["x-session-id"] = sessionId;
        }
        break;
      }
      case "web":
      default:
        break;
    }

    const response = await authApi.post("/token", null, {
      headers,
      withCredentials: true,
    });

    if (response.data.success) {
      switch (Platform) {
        case "desktop": {
          if (response.data.sessionId) {
            await secureStoreRpc.set(
              "sessionId",
              String(response.data.sessionId),
            );
          }
          break;
        }
        case "mobile": {
          if (response.data.sessionId) {
            await SecureStore.setItemAsync(
              "sessionId",
              String(response.data.sessionId),
            );
          }
          break;
        }
        case "web":
        default:
          break;
      }
      return response.data.token;
    }
    return null;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
};
