import { useEffect } from "react";
import { useRouter } from "expo-router";
import auth from "../utils/welcome/auth";
import SocketMethods from "../utils/backend-services/socket-io";

const useAppInit = (shouldBeLoggedIn) => {
  const router = useRouter();

  useEffect(async () => {
    const success = await auth.checkShouldBeHere(router, shouldBeLoggedIn);
    // User should be logged in and IS logged in, then initialize app
    if (shouldBeLoggedIn & success) {
      await SocketMethods.openSocketConnection();
    }
  }, []);
};

export default useAppInit;
