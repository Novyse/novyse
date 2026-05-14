import EventEmitter from "@/src/utils/global/Events/EventEmitter";
import { fetchToken } from "./token";

// Module-level variables to store the token for non-React access
let currentToken: string | null = null;
let currentTokenExpiry = 0;
let tokenRequestPromise: Promise<string | null> | null = null;

// Callbacks to sync with React state if needed
let onTokenUpdate: ((token: string | null) => void) | null = null;

export const setOnTokenUpdate = (callback: (token: string | null) => void) => {
  onTokenUpdate = callback;
};

export const setCurrentToken = (token: string | null) => {
  currentToken = token;
  currentTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  if (onTokenUpdate) {
    onTokenUpdate(currentToken);
  }
};

/**
 * Singleton getter for the auth token.
 * Can be used outside React components (e.g., in api-gateway or socket-io).
 */
export const getAuthToken = async (): Promise<string | null> => {

  // If token is valid, return it
  if (currentToken && Date.now() < currentTokenExpiry - 10000) {
    return currentToken;
  }

  // If a request is already in progress, wait for it
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  // Fetch a new token
  tokenRequestPromise = (async () => {
    try {
      const token = await fetchToken();
      if (token) {
        currentToken = token;
        currentTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
      } else {
        currentToken = null;
        currentTokenExpiry = 0;

        // If fetchToken returns null (not throwing), it means the server explicitly returned success: false.
        // This typically means the session is invalid.
        EventEmitter.getEmitter().emit("invalidSession");
      }

      if (onTokenUpdate) {
        onTokenUpdate(currentToken);
      }

      return currentToken;
    } catch (error: any) {
      // Check if it's a 401 error (Unauthorized)
      if (error.response && error.response.status === 401) {
        currentToken = null;
        currentTokenExpiry = 0;
        EventEmitter.getEmitter().emit("invalidSession");
        
        if (onTokenUpdate) {
          onTokenUpdate(currentToken);
        }
      } else {
        // It's a 500 or network error, ignore and keep session
        console.log("fetchToken failed with server or network error. Ignoring to maintain session.", error.message);
      }
      
      return currentToken;
    } finally {
      tokenRequestPromise = null;
    }
  })();

  return tokenRequestPromise;
};

export const clearAuthToken = () => {
  currentToken = null;
  currentTokenExpiry = 0;
  if (onTokenUpdate) {
    onTokenUpdate(null);
  }
};
