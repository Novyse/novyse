import { useEffect } from "react";
import { useRouter } from "expo-router";
import auth from "@/app/utils/welcome/auth";
import SocketIO from "@/app/utils/backend-services/socket-io";

const useAppInit = (shouldBeLoggedIn) => {
  const router = useRouter();

  useEffect(() => {
    const appInit = async () => {
      const success = await auth.checkShouldBeHere(router, shouldBeLoggedIn);
      // User should be logged in and IS logged in, then initialize app
      if (shouldBeLoggedIn & success) {
        await SocketIO.open();
      }
    };
    appInit();
  }, []);
};

export default useAppInit;
