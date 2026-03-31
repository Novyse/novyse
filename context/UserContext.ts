import { create } from "zustand";
import { User } from "@/src/types";
import database from "@/src/utils/storage/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserState {
  /** UUID of the logged-in user */
  localUserUUID: string;
  /** Cache of all users keyed by UUID */
  users: Record<string, User>;
  loading: boolean;

  init: () => Promise<void>;
  getUser: (uuid: string) => User | null;
  getUserByHandle: (handle: string) => User | null;

  _eventsSetup: boolean;
  setupEvents: () => Promise<void>;
  onProfileUpdate: (data: Partial<User> & { userUUID: string }) => void;
  onNewChat: (data: { chat: any; users: User[] }) => void;
  onNewMember: (data: { chatUUID: string; user: User }) => void;
  clear: () => void;
}

const mapRawToUser = (raw: any): User => ({
  uuid: raw.uuid,
  email: raw.email ?? null,
  name: raw.name,
  surname: raw.surname,
  handle: raw.handle ?? "",
  profilePictureUUID: raw.profilePictureUUID ?? null,
  description: raw.description ?? null,
  birthday: raw.birthday ?? null,
  region: raw.region ?? null,
  country: raw.country ?? null,
});

const useUserStore = create<UserState>((set, get) => ({
  localUserUUID: "",
  users: {},
  loading: false,

  init: async () => {
    set({ loading: true });

    // Load all users from DB into cache
    const rawUsers: any[] = await database.user.get.all();
    const usersMap: Record<string, User> = {};
    for (const raw of rawUsers) {
      const user = mapRawToUser(raw);
      usersMap[user.uuid] = user;
    }

    // Get local user UUID
    const localUserUUID = await AsyncStorage.getItem("userUUID");

    set({
      users: usersMap,
      localUserUUID: localUserUUID || "",
      loading: false,
    });

    get().setupEvents();
  },

  getUser: (uuid: string) => {
    return get().users[uuid] ?? null;
  },

  getUserByHandle: (handle: string) => {
    return Object.values(get().users).find((u) => u.handle === handle) ?? null;
  },

  _eventsSetup: false,

  setupEvents: async () => {
    if (get()._eventsSetup) return;
    const { default: eventEmitter } =
      await import("@/src/utils/global/Events/EventEmitter");

    eventEmitter.getEmitter().on("user:profile:update", get().onProfileUpdate);
    eventEmitter.getEmitter().on("chat:new", get().onNewChat);
    eventEmitter.getEmitter().on("chat:member:joined", get().onNewMember);

    set({ _eventsSetup: true });
  },

  onProfileUpdate: (data: Partial<User> & { userUUID: string }) => {
    const { userUUID, ...updates } = data;

    set((state) => {
      const existing = state.users[userUUID];
      if (!existing) return state;

      // Filter out undefined values to avoid overwriting existing data
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );

      const updated = { ...existing, ...cleanUpdates };
      return { users: { ...state.users, [userUUID]: updated } };
    });
  },

  onNewChat: (data) => {
    const { users } = data;
    const usersMap: Record<string, User> = {};
    for (const raw of users) {
      const user = mapRawToUser(raw);
      if (usersMap[user.uuid]) continue;
      usersMap[user.uuid] = user;
    }

    set((state) => ({ users: { ...state.users, ...usersMap } }));
  },

  onNewMember: (data) => {
    const { user } = data;
    const mappedUser = mapRawToUser(user);
    set((state) => ({
      users: { ...state.users, [mappedUser.uuid]: mappedUser },
    }));
  },

  clear: () => {
    set({
      localUserUUID: "",
      users: {},
      loading: false,
      _eventsSetup: false,
    });
  },
}));

export default useUserStore;
