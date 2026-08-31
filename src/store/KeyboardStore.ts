import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface KeyboardState {
  keyboardHeight: number;
  setKeyboardHeight: (height: number) => void;
}

export const useKeyboardStore = create<KeyboardState>()(
  persist(
    (set) => ({
      keyboardHeight: 280, // Default fallback height
      setKeyboardHeight: (height) => set({ keyboardHeight: height }),
    }),
    {
      name: "keyboard-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
