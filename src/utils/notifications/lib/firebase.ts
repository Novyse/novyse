import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  AuthorizationStatus,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
  requestPermission,
  getToken,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import gateway from "../../backend-services/api-gateway";
import { auth } from "@/src/utils/backend-services/auth";
import useNetworkStore from "@/src/context/NetworkContext";

const FCM_TOKEN_KEY = "fcm_push_token";

class FirebaseMessagingManager {
  private initialized = false;

  private getMessagingInstance() {
    return getMessaging(getApp());
  }

  async init(onMessageReceived: (message: any) => void) {
    if (Platform.OS === "web" || this.initialized) return;
    this.initialized = true;

    const messaging = this.getMessagingInstance();

    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("Firebase push notification permission granted.");
      await this.updateToken();
    } else {
      console.warn("Firebase push notification permission denied.");
    }

    onMessage(messaging, async (remoteMessage) => {
      console.info("FCM Message received in foreground:", remoteMessage);
      onMessageReceived(remoteMessage);
    });

    onTokenRefresh(messaging, async (token) => {
      console.info("FCM Token refreshed:", token);
      await this.saveToken(token);
    });

    // Listen for auth token updates to sync FCM token upon login
    auth.token.onUpdate(async (authToken: String | null) => {
      if (authToken) {
        console.log("Auth token updated, syncing FCM token...");
        await this.updateToken();
      }
    });

    // Subscribe to network store changes to retry FCM token sync when online
    let wasConnected = false;
    useNetworkStore.subscribe(async (state) => {
      const isConnected = state.isConnected;
      if (isConnected && !wasConnected) {
        console.log("Network online, updating FCM token...");
        await this.updateToken();
      }
      wasConnected = isConnected;
    });
  }

  async updateToken() {
    try {
      const messaging = this.getMessagingInstance();
      const token = await getToken(messaging);
      if (token) {
        await this.saveToken(token);
      }
    } catch (error) {
      console.error("Error getting FCM token:", error);
    }
  }

  private async saveToken(token: string) {
    // Only send the token to the backend if the user is authenticated
    const authToken = await auth.token.get();
    if (!authToken) {
      console.log("User not logged in, skipping FCM token sync to backend.");
      return;
    }

    const { isConnected } = useNetworkStore.getState();
    if (!isConnected) {
      console.log(
        `[FirebaseMessaging] App not connected. Skipping push token sync for now.`,
      );
      return;
    }

    const savedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (token !== savedToken) {
      const success = await gateway.notification.setFCMToken(token);
      if (success) {
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        console.log("FCM push token updated successfully", token);
      }
    }
  }

  setBackgroundHandler(handler: (message: any) => Promise<void>) {
    if (Platform.OS !== "web") {
      const messaging = this.getMessagingInstance();
      setBackgroundMessageHandler(messaging, handler);
    }
  }
}

const firebaseMessagingManager = new FirebaseMessagingManager();
export default firebaseMessagingManager;
