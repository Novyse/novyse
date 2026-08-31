import { NovyseAuth } from "@novyse/auth";

import { BRANCH } from "@/app.config";
import Platform from "@/src/utils/device/type";

import * as SecureStore from "expo-secure-store";
import { secureStoreRpc } from "@/src/utils/electron/secureStore";
import eventEmitter from "@/src/utils/global/Events/lib/EventEmitter";

const getStorageAdapter = () => {
  if (Platform === "desktop") {
    return {
      getItem: (key: string) =>
        secureStoreRpc.get(key) as Promise<string | null>,
      setItem: async (key: string, val: string) => {
        await secureStoreRpc.set(key, val);
      },
      removeItem: async (key: string) => {
        await secureStoreRpc.delete(key);
      },
    };
  } else if (Platform === "mobile") {
    return {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: async (key: string, val: string) => {
        await SecureStore.setItemAsync(key, val);
      },
      removeItem: async (key: string) => {
        await SecureStore.deleteItemAsync(key);
      },
    };
  }
  return undefined;
};

export const auth = new NovyseAuth({
  branch: BRANCH as "development" | "preview" | "production",
  platform: Platform as "mobile" | "desktop" | "web",
  storageAdapter: getStorageAdapter(),
});

auth.token.onInvalidSession(() => {
  eventEmitter.emit("invalidSession");
});

export default auth;
