import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import auth from "@/src/utils/backend-services/auth";
import gateway from "@/src/utils/backend-services/api-gateway";
import database from "@/src/utils/storage/database";
import EventEmitter from "@/src/utils/global/Events/EventEmitter";

import messageUtils from "@/src/utils/chat/message";
import notificationManager from "@/src/utils/notifications/manager";
import useUserStore from "@/context/UserContext";
import useChatStore from "@/context/ChatContext";

import { useActiveChatStore } from "@/context/ActiveChatContext";
import { resetGlobalNavState } from "@/src/components/tabs/TabNavigator";

/**
 * Check if the user is logged in by verifying local session markers.
 * Web: Checks for the existence of the 'userUUID' in AsyncStorage.
 * Mobile: Checks for the 'sessionId' in SecureStore.
 * @returns {Boolean} true if the user is logged in, false otherwise
 */
const isLoggedIn = async () => {
  if (Platform.OS === "web") {
    // We use the presence of 'userUUID' as marker.
    const userUUID = await AsyncStorage.getItem("userUUID");
    return userUUID !== null;
  } else {
    // On Mobile, we check for the sessionId in SecureStore.
    try {
      const sessionId = await SecureStore.getItemAsync("sessionId");
      return sessionId !== null;
    } catch (error) {
      console.error("Error checking mobile session:", error);
      return false;
    }
  }
};

const getUserUUID = async () => {
  const userUUID = await AsyncStorage.getItem("userUUID");
  return userUUID;
};

/**
 * Store the login state in AsyncStorage.
 * @param {Object}  router - The router object for navigation.
 * @param {boolean} shouldBeLoggedIn
 * @returns {boolean} true if the user is in the correct state, false if redirected
 */

const checkShouldBeHere = async (router, shouldBeLoggedIn = true) => {
  const loggedIn = await isLoggedIn();
  if (shouldBeLoggedIn && !loggedIn) {
    console.warn("User should be logged in but is not. Redirecting to login.");
    router.replace("/welcome");
    return false;
  } else if (!shouldBeLoggedIn && loggedIn) {
    console.warn(
      "User should not be logged in but is. Redirecting to messages.",
    );
    router.replace("/app");
    return false;
  }
  return true;
};

const initializeDatabase = async () => {
  // Add expo push token if mobile
  await notificationManager.updatePushToken();

  const { success, local, chats, users, messages } =
    await gateway.user.initialize();

  if (success) {
    console.log("Database instance created:", database);
    await database.clear();
    await database.initialize();

    // Store user
    await database.user.add(local.user);
    await AsyncStorage.setItem("localUserEventID", String(local.user.eventID));

    // Store pinned chat
    for (const pinnedChat of local.pinnedChats) {
      await database.chat.pin.add(pinnedChat.chatUUID, pinnedChat.position);
    }

    await database.user.addMultiple(users);
    await database.chat.addMultiple(chats);

    await messageUtils.addMultiple(messages);

    console.log("All data stored in local database.");
    return true;
  }
  return false;
};

const logout = async () => {
  console.log("Logging out user...");
  const success = await auth.logout();
  if (!success) {
    console.error(
      "Logout failed at API level, but proceeding with local cleanup.",
    );
  } else {
    console.log("Logout successful at API level.");
  }

  await database.clear();
  await AsyncStorage.clear();

  if (Platform.OS !== "web") {
    try {
      await SecureStore.deleteItemAsync("sessionId");
    } catch (error) {
      console.error("Error clearing mobile session:", error);
    }
  }

  // Clear every context/store
  useUserStore.getState().clear();
  useChatStore.getState().clear();
  useActiveChatStore.getState().clear();
  resetGlobalNavState();

  EventEmitter.getEmitter().emit("auth:changed");
};

const updateDatabase = async () => {
  const gatewayLocal = {
    eventID: (await AsyncStorage.getItem("localUserEventID")) || 0,
  };
  const { chats: gatewayChats, users: gatewayUsers } =
    await database.user.update.getAllEventsIDs();

  const { success, local, users, chats, messages } = await gateway.user.update(
    gatewayLocal,
    gatewayChats,
    gatewayUsers,
  );

  if (success) {
    // 1. New Chats
    if (chats?.new && Array.isArray(chats.new)) {
      console.log("Sync: Adding", chats.new.length, "new chats");
      await database.chat.addMultiple(chats.new);
    }

    // 2. New Users
    if (users?.new && Array.isArray(users.new)) {
      console.log("Sync: Adding", users.new.length, "new users");
      await database.user.addMultiple(users.new);
    }

    // 3. Messages
    if (messages && Array.isArray(messages) && messages.length > 0) {
      console.log("Sync: Adding", messages.length, "new messages");
      await database.message.addMultiple(messages);
    }

    // 4. Chat Events
    if (chats?.events && Array.isArray(chats.events)) {
      for (const event of chats.events) {
        console.log(
          "Sync: Chat Event received",
          event.type,
          "for chat",
          event.chat_uuid,
        );
        // TODO: Handle specific chat events (name change, new member, etc.)
      }
    }

    // 5. User Profile Events
    if (users?.events && Array.isArray(users.events)) {
      for (const event of users.events) {
        console.log(
          "Sync: User Profile Event received",
          event.type,
          "for user",
          event.user_uuid,
        );
        // TODO: Handle specific profile events (name, surname, etc.)
      }
    }

    // 6. Local User Events
    if (local && Array.isArray(local)) {
      for (const event of local) {
        console.log("Sync: Local Event received", event.type, event.id);
        // TODO: Handle specific local events (pinned chats, settings, etc.)
      }
    }
  }
};

const setLogin = async (userUUID, sessionID, session_id) => {
  try {
    await AsyncStorage.setItem("init", "false");

    if (userUUID) {
      await AsyncStorage.setItem("userUUID", String(userUUID));
    }
    if (sessionID) {
      await AsyncStorage.setItem("sessionID", String(sessionID));
    }

    if (Platform.OS !== "web" && session_id) {
      await SecureStore.setItemAsync("sessionId", String(session_id));
    }

    EventEmitter.getEmitter().emit("auth:changed");
  } catch (error) {
    console.error("Error during setLogin:", error);
  }
};

export default {
  isLoggedIn,
  getUserUUID,
  checkShouldBeHere,
  setLogin,
  initializeDatabase,
  updateDatabase,
  logout,
};
