import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SIDEBAR_MIN = 250;
export const SIDEBAR_COLLAPSED = 80;

// Minimum widths used by the forum multi-column layout (SubList | Chat | Vocal)
export const SUBLIST_MIN = 70;
export const SUBLIST_DEFAULT = 250;
export const CHAT_MIN = 350;
export const VOCAL_MIN = 350;

interface WindowSizeState {
  detailWidth: number;
  minDetailWidth: number;
  vocalWidth: number;
  subListWidth: number;
  setDetailWidth: (width: number | ((prev: number) => number)) => void;
  setMinDetailWidth: (width: number) => void;
  setVocalWidth: (width: number | ((prev: number) => number)) => void;
  setSubListWidth: (width: number | ((prev: number) => number)) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isStorageReady: boolean;
  init: () => Promise<void>;
}

const STORAGE_KEY = "@novyse_layout_window_size";

const useWindowSizeStore = create<WindowSizeState>((set, get) => ({
  detailWidth: 500,
  minDetailWidth: 400,
  vocalWidth: 350,
  subListWidth: SUBLIST_DEFAULT,
  isSidebarCollapsed: false,
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
          subListWidth: parsed.subListWidth ?? SUBLIST_DEFAULT,
          isSidebarCollapsed: parsed.isSidebarCollapsed ?? false,
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
    saveToStorageThrottled(get());
  },

  setMinDetailWidth: (minWidth) => {
    set({ minDetailWidth: minWidth });
    saveToStorageThrottled(get());
  },

  setVocalWidth: (width) => {
    const nextWidth =
      typeof width === "function" ? width(get().vocalWidth) : width;
    set({ vocalWidth: nextWidth });
    saveToStorageThrottled(get());
  },

  setSubListWidth: (width) => {
    const nextWidth =
      typeof width === "function" ? width(get().subListWidth) : width;
    set({ subListWidth: nextWidth });
    saveToStorageThrottled(get());
  },

  setSidebarCollapsed: (collapsed) => {
    set({ isSidebarCollapsed: collapsed });
    saveToStorageThrottled(get());
  },
}));

let saveTimeout: any = null;
const saveToStorageThrottled = (state: WindowSizeState) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveToStorage(state);
  }, 500);
};

const saveToStorage = async (state: WindowSizeState) => {
  try {
    const data = JSON.stringify({
      detailWidth: state.detailWidth,
      minDetailWidth: state.minDetailWidth,
      vocalWidth: state.vocalWidth,
      subListWidth: state.subListWidth,
      isSidebarCollapsed: state.isSidebarCollapsed,
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
