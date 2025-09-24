import { useEffect } from "react";

import eventEmitter from "./lib/EventEmitter";

import auth from "../../welcome/auth";
import { useRouter } from "expo-router";

export default function SetupGlobalEventReceiver() {
  const router = useRouter();

  useEffect(() => {
    const handleUserSessionInvalid = async () => {
      console.log("User session became invalid. Taking action... 🍹");
      auth.logout(router);
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
