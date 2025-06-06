import { useEffect } from "react";

import eventEmitter from "../EventEmitter";

import localDatabase from "../localDatabaseMethods";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SetupGlobalEventReceiver() {
  const router = useRouter();

  useEffect(() => {
    const handleUserSessionInvalid = async () => {
      console.log("User session became invalid. Taking action... 🍹");
      // da qui tocca chiamare metodo per il logout, per ora faccio a manina dopo è da sistemare
      await localDatabase.clearDatabase();
      await AsyncStorage.setItem("isLoggedIn", "false");
      router.navigate("/loginSignup/EmailCheckForm");
    };

    // ------------------> global event listeners
    // session invalid event
    eventEmitter.on("invalidSession", handleUserSessionInvalid);

    // ------------------> global event listeners END

    return () => {
      eventEmitter.off("invalidSession", handleUserSessionInvalid);
    };
  }, []);

  // This component is used to set up global event listeners
  // It doesn't render anything, just initializes the listeners
  return true;
}
