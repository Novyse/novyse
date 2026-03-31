import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface WindowSizeState {
  detailWidth: number;
  minDetailWidth: number;
  vocalWidth: number;
  setDetailWidth: (width: number | ((prev: number) => number)) => void;
  setMinDetailWidth: (width: number) => void;
  setVocalWidth: (width: number | ((prev: number) => number)) => void;
  isStorageReady: boolean;
  init: () => Promise<void>;
}

const STORAGE_KEY = "@novyse_layout_window_size";

const useWindowSizeStore = create<WindowSizeState>((set, get) => ({
  detailWidth: 500,
  minDetailWidth: 400,
  vocalWidth: 350,
  isStorageReady: false,

  init: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          detailWidth: parsed.detailWidth ?? 500,
          minDetailWidth: parsed.minDetailWidth ?? 400,
          vocalWidth: parsed.vocalWidth ?? 350,
        });
      }
    } catch (e) {
      console.error("Failed to load layout state:", e);
    } finally {
      set({ isStorageReady: true });
    }
  },

  setDetailWidth: (width) => {
    const nextWidth =
      typeof width === "function" ? width(get().detailWidth) : width;
    set({ detailWidth: nextWidth });
    saveToStorage(get());
  },

  setMinDetailWidth: (minWidth) => {
    set({ minDetailWidth: minWidth });
    saveToStorage(get());
  },

  setVocalWidth: (width) => {
    const nextWidth =
      typeof width === "function" ? width(get().vocalWidth) : width;
    set({ vocalWidth: nextWidth });
    saveToStorage(get());
  },
}));

const saveToStorage = async (state: WindowSizeState) => {
  try {
    const data = JSON.stringify({
      detailWidth: state.detailWidth,
      minDetailWidth: state.minDetailWidth,
      vocalWidth: state.vocalWidth,
    });
    await AsyncStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    console.error("Failed to save layout state:", e);
  }
};

// Start initialization immediately on the client
if (typeof window !== "undefined") {
  useWindowSizeStore.getState().init();
}
export default useWindowSizeStore;
