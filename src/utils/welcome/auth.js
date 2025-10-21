import AsyncStorage from "@react-native-async-storage/async-storage";

import gateway from "../backend-services/api-gateway";
import Database from "../storage/database";

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
  await AsyncStorage.setItem("lastUpdateTimestamp", timestamp);
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
      "User should not be logged in but is. Redirecting to messages."
    );
    router.replace("/chat");
    return false;
  }
  return true;
};

const initializeApp = async () => {
  console.log("Initializing app...");
  const { success, lastUpdateTime, user, device, chats, messages } =
    await gateway.user.initialize();

  if (success) {
    console.info("Initialization successful:", {
      lastUpdateTime,
      user,
      device,
      chatsCount: chats,
      messagesCount: messages,
    });

    // Set last update timestamp
    if (lastUpdateTime) {
      await setLastUpdateTimestamp(lastUpdateTime);
      console.log("Last update timestamp set to:", lastUpdateTime);
    }

    // Set local user uuid in async storage
    await AsyncStorage.setItem("userUUID", user.uuid);
    await AsyncStorage.setItem("deviceUUID", device.uuid);

    const database = await Database.create();
    console.log("Database instance created:", database);
    await database.clear();
    await database.initialize();

    // Store user
    await database.addUserInfo(user);

    // Store chats and messages in database
    for (const chat of chats) {
      await database.addChat(chat);
    }

    for (const message of messages) {
      await database.addMessage(message);
    }

    console.log("All data stored in local database.");
    return true;
  }

  console.error("Initialization failed.");
  return false;
};

const logout = async (router) => {
  console.log("Logging out user...");
  const success = await gateway.auth.logout();
  if (!success) {
    console.error(
      "Logout failed at API level, but proceeding with local cleanup."
    );
  } else {
    console.log("Logout successful at API level.");
  }
  const database = await Database.create();
  await database.clear();
  await AsyncStorage.clear();
  router.replace("/welcome");
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

  const { success, user, chats, messages } =
    await gateway.user.update(lastUpdateTimestamp);

  if (success) {
    console.log("Update successful:", { user, chats, messages });

    const database = await Database.create();

    if (user) {
      // Do nothing
      //await database.addUserInfo(user);
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
        await database.addChat(chat);
      }
    }

    if (messages && messages.length > 0) {
      for (const message of messages) {
        await database.addMessage(message);
      }
    }

    const newTimestamp = new Date().toISOString();
    await AsyncStorage.setItem("lastUpdateTimestamp", newTimestamp);
    console.log("Updated last update timestamp to:", newTimestamp);

    return true;
  }
  console.error("Update failed.");
  return false;
};

export default {
  isLoggedIn,
  getLastUpdateTimestamp,
  setLastUpdateTimestamp,
  getUserUUID,
  getDeviceUUID,
  checkShouldBeHere,
  initializeApp,
  logout,
  update,
};
