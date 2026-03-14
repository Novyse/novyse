import AsyncStorage from "@react-native-async-storage/async-storage";

import gateway from "@/src/utils/backend-services/api-gateway";
import database from "@/src/utils/storage/database";
import EventEmitter from "@/src/utils/global/Events/EventEmitter";

import messageUtils from "@/src/utils/chat/message";

/**
 * Check if the user is logged in by verifying the presence of an access token in AsyncStorage.
 * @returns {Boolean} true if the user is logged in, false otherwise
 */
const isLoggedIn = async () => {
  const token = await AsyncStorage.getItem("accessToken");
  return token !== null;
};

const getUserUUID = async () => {
  const userUUID = await AsyncStorage.getItem("userUUID");
  return userUUID;
};

const getDeviceUUID = async () => {
  const deviceUUID = await AsyncStorage.getItem("deviceUUID");
  return deviceUUID;
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
  const { success, local, devices, chats, users, messages, at } =
    await gateway.user.initialize();

  if (success) {
    console.info("Initialization successful:", {
      local,
      devices,
      chats,
      users,
      messages: messages.length,
    });

    // Set last update timestamp
    if (at) {
      await setLastUpdateTimestamp(at);
      console.log("Last update timestamp set to:", at);
    }

    // Set local user uuid in async storage
    await AsyncStorage.setItem("userUUID", String(local.user.uuid));
    await AsyncStorage.setItem("deviceUUID", String(local.device.uuid));
    await AsyncStorage.setItem("init", "false");

    return true;
  }

  console.error("Initialization failed.");
  return false;
};

const initializeDatabase = async () => {
  const { success, local, devices, chats, users, messages, at } =
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
  const success = await gateway.auth.logout();
  if (!success) {
    console.error(
      "Logout failed at API level, but proceeding with local cleanup.",
    );
  } else {
    console.log("Logout successful at API level.");
  }

  await database.clear();
  await AsyncStorage.clear();
};

const update = async () => {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    console.warn("User is not logged in. Skipping update.");
    return false;
  }

  console.log("Starting update process...");

  const lastUpdateTimestamp = await getLastUpdateTimestamp();
  console.log("Last update timestamp:", lastUpdateTimestamp);

  const { success, user, chats, messages, updated_at } =
    await gateway.user.update(lastUpdateTimestamp);

  if (success) {
    console.log("Update successful:", { user, chats, messages });

    if (user) {
      // Do nothing
      //await database.user.add(user);
    }

    if (chats && chats.length > 0) {
      for (const chat of chats) {
        chat.members = chat.members.map((member) => ({
          uuid: member.uuid,
          name: member.name,
          surname: member.surname,
          handle: member.handle,
          profilePictureUUID: member.profilePictureUUID,
        }));
        await database.chat.add(chat);
      }
    }

    if (messages && messages.length > 0) {
      for (const message of messages) {
        await EventEmitter.newMessage(message);
      }
    }

    await AsyncStorage.setItem("lastUpdateTimestamp", String(updated_at));

    return true;
  }
  console.error("Update failed.");
  return false;
};

const updateDatabase = async () => {
  return;
  const lastUpdateTimestamp = await getLastUpdateTimestamp();
  console.log("Last update timestamp:", lastUpdateTimestamp);

  const { success, user, chats, messages, updated_at } =
    await gateway.user.update(lastUpdateTimestamp);
};

export default {
  isLoggedIn,
  getLastUpdateTimestamp,
  setLastUpdateTimestamp,
  getUserUUID,
  getDeviceUUID,
  checkShouldBeHere,
  initializeApp,
  initializeDatabase,
  updateDatabase,
  logout,
  update,
};
