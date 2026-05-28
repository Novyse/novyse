import Platform from "@/src/utils/device/type";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStoreRpc } from "@/src/utils/electron/secureStore";

import auth from "@/src/utils/backend-services/auth";
import gateway from "@/src/utils/backend-services/api-gateway";
import SocketIO from "@/src/utils/backend-services/socket-io";
import database from "@/src/utils/storage/database";
import EventEmitter from "@/src/utils/global/Events/EventEmitter";

import messageUtils from "@/src/utils/chat/message";
import notificationManager from "@/src/utils/notifications/manager";
import useUserStore from "@/src/context/UserContext";
import useChatStore from "@/src/context/ChatContext";

import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import { resetGlobalNavState } from "@/src/components/tabs/TabNavigator";
import {
  ChatEventType,
  UserProfileEventType,
  UserEventType,
} from "@/src/types/event";

/**
 * Check if the user is logged in by verifying local session markers.
 * Web: Checks for the existence of the 'userUUID' in AsyncStorage.
 * Mobile: Checks for the 'sessionId' in SecureStore.
 * Desktop: Checks for the existence of the 'userUUID' in AsyncStorage and 'sessionId' in OS Keychain.
 * @returns {Boolean} true if the user is logged in, false otherwise
 */
const isLoggedIn = async () => {
  switch (Platform) {
    case "web": {
      const userUUID = await AsyncStorage.getItem("userUUID");
      return userUUID !== null;
    }
    case "desktop": {
      try {
        const userUUID = await AsyncStorage.getItem("userUUID");
        if (userUUID === null) return false;
        const sessionId = await secureStoreRpc.get("sessionId");
        return sessionId !== null && sessionId !== undefined;
      } catch (error) {
        console.error("Error checking desktop session:", error);
        return false;
      }
    }
    case "mobile":
    default: {
      try {
        const sessionId = await SecureStore.getItemAsync("sessionId");
        return sessionId !== null;
      } catch (error) {
        console.error("Error checking mobile session:", error);
        return false;
      }
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
  SocketIO.close();

  switch (Platform) {
    case "desktop": {
      try {
        await secureStoreRpc.delete("sessionId");
      } catch (error) {
        console.error("Error clearing desktop session:", error);
      }
      break;
    }
    case "mobile": {
      try {
        await SecureStore.deleteItemAsync("sessionId");
      } catch (error) {
        console.error("Error clearing mobile session:", error);
      }
      break;
    }
    case "web":
    default:
      break;
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
    eventID: (await AsyncStorage.getItem("userEventID")) || 0,
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
    if (chats?.new && Array.isArray(chats.new) && chats.new.length > 0) {
      console.log("Sync: Adding", chats.new.length, "new chats");
      await database.chat.addMultiple(chats.new);
    }

    // 2. New Users
    if (users?.new && Array.isArray(users.new) && users.new.length > 0) {
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
          event.chatUUID,
        );
        const chatUUID = event.chatUUID;
        const { messageID } = event.payload;

        switch (event.type) {
          case ChatEventType.MESSAGE_EDITED:
            await EventEmitter.message.update(
              chatUUID,
              messageID,
              "edit",
              event.id,
              event.payload,
            );
            break;
          case ChatEventType.REACTION_ADDED:
            const reactionAddedPayload = event.payload;
            reactionAddedPayload.reactedAt = event.createdAt;
            reactionAddedPayload.userUUID = event.userUUID;
            await EventEmitter.message.update(
              chatUUID,
              messageID,
              "reaction_add",
              event.id,
              reactionAddedPayload,
            );
            break;
          case ChatEventType.REACTION_REMOVED:
            const reactionRemovedPayload = event.payload;
            reactionRemovedPayload.userUUID = event.userUUID;
            await EventEmitter.message.update(
              chatUUID,
              messageID,
              "reaction_remove",
              event.id,
              reactionRemovedPayload,
            );
            break;
          case ChatEventType.MESSAGE_DELETED:
            await EventEmitter.message.update(
              chatUUID,
              messageID,
              "delete",
              event.id,
              event.payload,
            );
            break;
          case ChatEventType.MESSAGE_PINNED:
            const messagePinnedPayload = event.payload;
            messagePinnedPayload.pinnedAt = event.createdAt;
            messagePinnedPayload.userUUID = event.userUUID;
            await EventEmitter.message.update(
              chatUUID,
              messageID,
              "pin_add",
              event.id,
              event.payload,
            );
            break;
          case ChatEventType.MESSAGE_UNPINNED:
            await EventEmitter.message.update(
              chatUUID,
              messageID,
              "pin_remove",
              event.id,
              event.payload,
            );
            break;
          case ChatEventType.MEMBER_JOINED:
            await EventEmitter.chat.member.join(
              chatUUID,
              { uuid: event.userUUID },
              event.id,
            );
            break;
          case ChatEventType.MEMBER_LEFT:
            await EventEmitter.chat.member.leave(chatUUID, {
              uuid: event.userUUID,
            });
            break;
          case ChatEventType.MESSAGE_READ:
            await EventEmitter.message.update(
              chatUUID,
              event.payload.messageID,
              "read",
              event.id,
              {
                userUUID: event.userUUID,
                readAt: event.createdAt,
              },
            );
            break;
          default:
            console.warn("Sync: Unhandled chat event type", event.type);
            break;
        }
      }
    }

    // 5. User Profile Events
    if (users?.events && Array.isArray(users.events)) {
      for (const event of users.events) {
        console.log(
          "Sync: User Profile Event received",
          event.type,
          "for user",
          event.userUUID,
        );
        const userUUID = event.userUUID;

        switch (event.type) {
          case UserProfileEventType.BIO_CHANGED:
          case UserProfileEventType.PICTURE_CHANGED:
          case UserProfileEventType.BANNER_CHANGED:
          case UserProfileEventType.NAME_CHANGED:
          case UserProfileEventType.SURNAME_CHANGED:
          case UserProfileEventType.BIRTHDAY_CHANGED:
          case UserProfileEventType.COLOR_CHANGED:
          case UserProfileEventType.HANDLE_CHANGED:
            await EventEmitter.user.profile.update(
              { ...event.payload, userUUID },
              event.id,
            );
            break;
          default:
            console.warn("Sync: Unhandled profile event type", event.type);
            break;
        }
      }
    }

    // 6. Local User Events
    if (local && Array.isArray(local)) {
      for (const event of local) {
        console.log("Sync: Local Event received", event.type, event.id);
        const chatUUID = event.chatUUID;

        switch (event.type) {
          case UserEventType.CHAT_PINNED:
            await EventEmitter.user.setting.chat.update(
              chatUUID,
              "pin_add",
              event.id,
              event.payload,
            );
            break;
          case UserEventType.CHAT_UNPINNED:
            await EventEmitter.user.setting.chat.update(
              chatUUID,
              "pin_remove",
              event.id,
              event.payload,
            );
            break;
          default:
            console.warn("Sync: Unhandled local event type", event.type);
            break;
        }
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

    switch (Platform) {
      case "desktop": {
        if (session_id) {
          await secureStoreRpc.set("sessionId", String(session_id));
        }
        break;
      }
      case "mobile": {
        if (session_id) {
          await SecureStore.setItemAsync("sessionId", String(session_id));
        }
        break;
      }
      case "web":
      default:
        break;
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
