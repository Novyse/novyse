import { create } from 'zustand';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';

interface NetworkState {
  isConnected: boolean;
  connectionType: NetInfoStateType | null;
  init: () => void;
}

const useNetworkStore = create<NetworkState>((set) => {
  let unsubscribe: (() => void) | null = null;
  return {
    isConnected: false,
    connectionType: null,
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
