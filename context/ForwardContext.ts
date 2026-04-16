import { create } from "zustand";

interface ForwardState {
  forwardMessages: any[];
  isForwarding: boolean;
  setForwardMessages: (messages: any[]) => void;
  resetForwarding: () => void;
}

export const useForwardStore = create<ForwardState>((set) => ({
  forwardMessages: [],
  isForwarding: false,
  setForwardMessages: (messages) => set({ forwardMessages: messages, isForwarding: true }),
  resetForwarding: () => set({ forwardMessages: [], isForwarding: false }),
}));
