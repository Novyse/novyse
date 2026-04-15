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
 * Store the last update timestamp in AsyncStorage.
 * @param {Timestamp} timestamp
 * @returns {void}
 */

const setLastUpdateTimestamp = async (timestamp) => {
  await AsyncStorage.setItem("lastUpdateTimestamp", String(timestamp));
};

/**
 * Get the last update timestamp from AsyncStorage.
 * @returns {string|null} The last update timestamp or null if not set.
 */

const getLastUpdateTimestamp = async () => {
  const timestamp = await AsyncStorage.getItem("lastUpdateTimestamp");
  return timestamp;
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

const initializeApp = async () => {
  console.log("Initializing app...");
  const { success, local, sessions, chats, users, messages, at } =
    await gateway.user.initialize();

  if (success) {
    console.info("Initialization successful:", {
      local,
      sessions,
      chats,
      users,
      messages: messages.length,
    });

    // Set last update timestamp
    if (at) {
      await setLastUpdateTimestamp(at);
      console.log("Last update timestamp set to:", at);
    }

    // Add expo push token if mobile
    await notificationManager.updatePushToken();

    // Set local user uuid in async storage
    await AsyncStorage.setItem("userUUID", String(local.user.uuid));
    await AsyncStorage.setItem("sessionID", String(local.session.id));
    await AsyncStorage.setItem("init", "false");

    return true;
  }

  console.error("Initialization failed.");
  return false;
};

const initializeDatabase = async () => {
  const { success, local, sessions, chats, users, messages, at } =
    await gateway.user.initialize();

  if (success) {
    console.log("Database instance created:", database);
    await database.clear();
    await database.initialize();

    // Store user
    await database.user.add(local.user);

    // Store pinned chat
    for (const pinnedChat of local.pinnedChats) {
      await database.chat.pin.add(pinnedChat.chatUUID, pinnedChat.position);
    }

    for (const user of users) {
      await database.user.add(user);
    }

    // Store chats and messages in database
    for (const chat of chats) {
      await database.chat.add(chat);
    }

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
  const lastUpdateTimestamp = await getLastUpdateTimestamp();

  // Il timestamp da getLastUpdateTimestamp è già una stringa ISO "2026-03-15T17:46:04.013057+00:00"
  // Quindi lo passiamo direttamente, o calcoliamo la data solo in caso sia un numero (in secondi come in precedenza)
  let atTime = lastUpdateTimestamp;
  if (
    lastUpdateTimestamp &&
    !isNaN(lastUpdateTimestamp) &&
    !lastUpdateTimestamp.includes("T")
  ) {
    atTime = new Date(Number(lastUpdateTimestamp) * 1000).toISOString();
  }

  const { success, local, user, chat, message, at } =
    await gateway.user.update(atTime);

  if (success) {
    if (local) {
      if (local.user) {
        await EventEmitter.user.profile.update(local.user);
      }
      if (local.pinnedChats && Array.isArray(local.pinnedChats)) {
        const existingPins = await database.chat.pin.get();
        const newPinnedUUIDs = local.pinnedChats.map((p) => p.chatUUID);

        if (existingPins && Array.isArray(existingPins)) {
          for (const existingPin of existingPins) {
            if (!newPinnedUUIDs.includes(existingPin.chatUUID)) {
              await database.chat.pin.remove(existingPin.chatUUID);
            }
          }
        }

        for (const pin of local.pinnedChats) {
          if (pin.chatUUID && typeof pin.position === "number") {
            await database.chat.pin.add(pin.chatUUID, pin.position);
          }
        }
      }
    }

    if (user?.profile?.update && Array.isArray(user.profile.update)) {
      for (const u of user.profile.update) {
        await EventEmitter.user.profile.update(u);
      }
    }

    if (chat?.new && Array.isArray(chat.new)) {
      for (const c of chat.new) {
        await EventEmitter.chat.new(c, []);
      }
    }

    if (chat?.update) {
      const updates = Array.isArray(chat.update)
        ? chat.update
        : Object.values(chat.update);
      for (const c of updates) {
        if (c.chatUUID) {
          await EventEmitter.chat.update(c.chatUUID, c.action, c);
        }
      }
    }

    if (message?.new && Array.isArray(message.new)) {
      for (const m of message.new) {
        await EventEmitter.message.new(m);
      }
    }

    if (message?.update && Array.isArray(message.update)) {
      for (const m of message.update) {
        if (m.action === "update" || m.action === "edit") {
          const chatUUID = m.chatUUID;
          const messageID = m.id || m.messageID;

          const oldMessage = await database.message.get.by.id(
            chatUUID,
            messageID,
          );

          if (oldMessage && m.content && oldMessage.content !== m.content) {
            await EventEmitter.message.update(chatUUID, messageID, "edit", {
              content: m.content,
            });
          }

          if (m.reactions && Array.isArray(m.reactions)) {
            const oldReactionsRaw = await database.db.getAllAsync(
              "SELECT reaction, userUUID FROM reaction_message WHERE chatUUID = ? AND messageID = ?",
              [chatUUID, messageID],
            );

            for (const newR of m.reactions) {
              const exists = oldReactionsRaw.some(
                (oldR) =>
                  oldR.reaction === newR.reaction &&
                  oldR.userUUID === newR.userUUID,
              );
              if (!exists) {
                await EventEmitter.message.update(
                  chatUUID,
                  messageID,
                  "reaction_add",
                  {
                    reaction: newR.reaction,
                    at: newR.created_at,
                    userUUID: newR.userUUID,
                  },
                );
              }
            }

            for (const oldR of oldReactionsRaw) {
              const stillExists = m.reactions.some(
                (newR) =>
                  newR.reaction === oldR.reaction &&
                  newR.userUUID === oldR.userUUID,
              );
              if (!stillExists) {
                await EventEmitter.message.update(
                  chatUUID,
                  messageID,
                  "reaction_remove",
                  {
                    reaction: oldR.reaction,
                    userUUID: oldR.userUUID,
                  },
                );
              }
            }
          }

          const isPinnedInNew = !!m.pinned_at;
          const pinnedIds = (await database.message.pin.get(chatUUID)) || [];
          const isPinnedInDb = pinnedIds
            .map(String)
            .includes(String(messageID));

          if (isPinnedInNew && !isPinnedInDb) {
            await EventEmitter.message.update(chatUUID, messageID, "pin_add", {
              pinned_at: m.pinned_at,
              userUUID: m.pinned_by || m.userUUID,
            });
          } else if (!isPinnedInNew && isPinnedInDb) {
            await EventEmitter.message.update(
              chatUUID,
              messageID,
              "pin_remove",
              {},
            );
          }

          if (m.action === "edit") {
            await EventEmitter.message.update(
              m.chatUUID,
              m.id || m.messageID,
              m.action,
              m,
            );
          }
        } else {
          await EventEmitter.message.update(
            m.chatUUID,
            m.id || m.messageID,
            m.action,
            m,
          );
        }
      }
    }

    if (at) {
      await setLastUpdateTimestamp(at);
    }
  }
};

const setLogin = async ({ userUUID, accessToken, sessionId }) => {
  try {
    if (userUUID) {
      await AsyncStorage.setItem("userUUID", String(userUUID));
    }
    if (Platform.OS !== "web" && sessionId) {
      await SecureStore.setItemAsync("sessionId", String(sessionId));
    }

    EventEmitter.getEmitter().emit("auth:changed");
  } catch (error) {
    console.error("Error during setLogin:", error);
  }
};

export default {
  isLoggedIn,
  getLastUpdateTimestamp,
  setLastUpdateTimestamp,
  getUserUUID,
  checkShouldBeHere,
  setLogin,
  initializeApp,
  initializeDatabase,
  updateDatabase,
  logout,
};
