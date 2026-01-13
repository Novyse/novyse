import { Platform } from "react-native";

import mobile from "./mobile";
import web from "./web";

class Database {
  static async create() {
    if (Platform.OS === "web") {
      return mobile.create();
    } else {
      return mobile.create();
    }
  }
}

export default Database;
