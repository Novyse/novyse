import AsyncStorage from "@react-native-async-storage/async-storage";
import localDatabase from "../localDatabaseMethods";
import JsonParser from "../JsonParser";

async function storeSetIsLoggedIn(value) {
  try {
    await AsyncStorage.setItem("isLoggedIn", value);
    console.log("storeSetIsLoggedIn: ", value);
  } catch (e) {
    console.log(e);
  }
}

export async function clearDBAddTokenInit() {
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
}

export default {
  clearDBAddTokenInit,
};
