import AsyncStorage from "@react-native-async-storage/async-storage";
import localDatabase from "../localDatabaseMethods";
import JsonParser from "../JsonParser";
import gateway from "../backend-services/api-gateway";

import Database from "../storage/database";

const clearDBAddTokenInit = async () => {
  // Wait until localDatabase.db is available
  await new Promise((resolve) => {
    const checklocalDatabase = setInterval(() => {
      if (localDatabase.db) {
        clearInterval(checklocalDatabase);
        resolve();
      }
    }, 50);
  });

  // Clear the database
  await localDatabase.clearDatabase();

  // Check if the database exists
  const exists = await localDatabase.checkDatabaseExistence();
  console.log("Database exists:", exists);

  const initSuccess = await JsonParser.initJson();

  if (initSuccess) {
    console.log("Init Success ⭐");
    await storeSetIsLoggedIn("true");
  } else {
    console.log("Init Error");
  }

  return initSuccess;
};

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
    router.replace("/welcome/email-check");
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
  const { success, user, device, chats, messages } =
    await gateway.user.initialize();

  if (success) {
    console.info("Initialization successful:", {
      user,
      device,
      chatsCount: chats,
      messagesCount: messages,
    });

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
  // API logout @SamueleOrazioDurante
  const database = await Database.create();
  await database.clear();
  await localDatabase.clearDatabase();
  await AsyncStorage.clear();
  router.replace("/welcome/email-check");
};

export default {
  clearDBAddTokenInit,
  isLoggedIn,
  getLastUpdateTimestamp,
  getUserUUID,
  getDeviceUUID,
  checkShouldBeHere,
  initializeApp,
  logout,
};
