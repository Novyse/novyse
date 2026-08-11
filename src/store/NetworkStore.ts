import { create } from "zustand";
import NetInfo, { NetInfoStateType } from "@react-native-community/netinfo";

interface NetworkState {
  isConnected: boolean;
  connectionType: NetInfoStateType | null;
  isSynced: boolean;
  setSynced: (synced: boolean) => void;
  isSocketConnected: boolean;
  setSocketConnected: (connected: boolean) => void;
  apiError: string | null;
  setApiError: (error: string | null) => void;
  syncRetryCountdown: number;
  setSyncRetryCountdown: (countdown: number) => void;
  init: () => void;
}

const useNetworkStore = create<NetworkState>((set) => {
  let unsubscribe: (() => void) | null = null;
  return {
    isConnected: false,
    connectionType: null,
    isSynced: false,
    setSynced: (synced) => set({ isSynced: synced }),
    isSocketConnected: false,
    setSocketConnected: (connected) => set({ isSocketConnected: connected }),
    apiError: null,
    setApiError: (error) => set({ apiError: error }),
    syncRetryCountdown: 0,
    setSyncRetryCountdown: (countdown) =>
      set({ syncRetryCountdown: countdown }),
    init: () => {
      if (unsubscribe) return;
      unsubscribe = NetInfo.addEventListener((state) => {
        set({
          isConnected: state.isConnected ?? false,
          connectionType: state.type,
        });
      });
    },
  };
});

export default useNetworkStore;
