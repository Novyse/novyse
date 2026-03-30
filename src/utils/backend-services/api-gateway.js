import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getOs, getPlatform } from "../device/type.js";

import { getAuthToken } from "./auth/token-manager";
import { API_LINK } from "./config";

import { BRANCH, APP_VERSION } from "../../../app.config";

const api = axios.create({
  baseURL: API_LINK,
  withCredentials: false,
  timeout: 10000,
  headers: {
    "x-platform": getPlatform(),
    "x-operating-system": getOs(),
    "x-app-version": APP_VERSION,
  },
});

/**
 * Attach the access token to every request if available.
 * This ensures that authenticated endpoints can be accessed without manually adding the token each time.
 */

api.interceptors.request.use(async (request) => {
  if (request.skipAuth) {
    return request;
  }
  const accessToken = await getAuthToken();
  if (accessToken) {
    request.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return request;
});

/**
 * Logging middleware that logs request and response details.
 * This is useful for debugging and monitoring API interactions.
 */

api.interceptors.request.use((request) => {
  if (BRANCH !== "production") {
    console.log(
      `Starting Request: ${request.method.toUpperCase()} ${request.url}`,
      request.params || {},
      request.data || {},
    );
  }
  return request;
});

api.interceptors.response.use(async (response) => {
  if (Platform.OS !== "web") {
    const newSessionId = response.headers["x-set-session-id"];
    if (newSessionId) {
      await SecureStore.setItemAsync("sessionId", String(newSessionId));
    }
  }

  if (BRANCH !== "production") {
    console.log(
      `Response: ${response.config.method.toUpperCase()} ${response.config.url}`,
      response.data || {},
    );
  }
  return response;
});

const gateway = {
  check: {
    /**
     * Check if a handle is available.
     * @param {String} handle
     * @returns {Object} { success: boolean, free?: boolean }
     */
    async handle(handle) {
      const response = await api.get(`/check/handle?handle=${handle}`, {
        skipAuth: true,
      });
      const success = response.data.success;
      if (success) {
        const free = response.data.data.free;
        return { success, free };
      }
      return { success };
    },
  },

  user: {
    /**
     * Initialize user data after login.
     * @returns {Object} { success: boolean, local, chats, users, messages}
     */
    async initialize() {
      const response = await api.get("/user/initialize");
      const success = response.data.success;
      if (success) {
        const { local, devices, chats, users, messages, at } =
          response.data.data;
        return { success, local, devices, chats, users, messages, at };
      }
      return { success };
    },

    /**
     * Update user data since last update time.
     * @param {Timestamp} lastUpdateTime
     * @returns {Object} { success: boolean, user?:{ uuid?: String, name?: String, surname?: String, handle?: String}, chats?: Array[{uuid?: String, type? : [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{userUUID?: String, role_id?: Int}]}], messages?: Array[@SamueleOrazioDurante da completare]}
     */

    async update(lastUpdateTime) {
      // lastUpdateTime is a timestamp with ISO 8601 format
      if (!lastUpdateTime) {
        console.error("lastUpdateTime is required for user.update");
        return { success: false };
      }
      if (isNaN(Date.parse(lastUpdateTime))) {
        console.error("lastUpdateTime is not a valid ISO 8601 timestamp");
        return { success: false };
      }
      const response = await api.get(
        `/user/update?at=${encodeURIComponent(lastUpdateTime)}`,
      );
      console.log(response);
      const success = response.data.success;
      if (success) {
        const { local, user, chat, message, at } = response.data.data;
        return { success, local, user, chat, message, at };
      }

      return { success };
    },
    /**
     * Delete user's account.
     * @returns {boolean} true if the account was successfully deleted, false otherwise
     */
    async delete() {
      const response = await api.delete(`/auth/user`);
      const success = response.data.success;
      return success;
    },
    profile: {
      picture: {
        /**
         * Request user's profile picture update.
         * @param {String} name
         * @param {String} mimeType
         * @param {Number} size
         * @returns {Object} { success: boolean, fileUUID?: String, uploadURL?: String, expiresAt?: String }
         */
        async update(name, mimeType, size) {
          const response = await api.patch("/user/profile/picture", {
            name,
            mimeType,
            size,
          });
          const success = response.data.success;
          if (success) {
            const { fileUUID, uploadURL, expiresAt } = response.data.data;
            return { success, fileUUID, uploadURL, expiresAt };
          }
          return { success };
        },
        /**
         * Confirm user's profile picture update after successful upload.
         * @param {String} fileUUID
         * @returns {Object} { success: boolean, profilePictureUUID?: String }
         */
        async confirm(fileUUID) {
          const response = await api.post("/user/profile/picture/confirm", {
            fileUUID,
          });
          const success = response.data.success;
          if (success) {
            const { profilePictureUUID } = response.data.data;
            return { success, profilePictureUUID };
          }
          return { success };
        },
      },
      update: {
        /**
         * Update user's profile information.
         * @param {String} name
         * @param {String} surname
         * @param {String} description
         * @returns {Object} { success: boolean }
         */
        async all(name, surname, description) {
          const response = await api.patch("/user/profile", {
            name,
            surname,
            description,
          });
          const success = response.data.success;
          if (success) {
            return { success };
          }
          return { success };
        },
      },
      badges: {
        /**
         * Get user's badges.
         * @param {String} userUUID
         * @returns {Object} { success: boolean, badges?: Array }
         */
        async get(userUUID) {
          const response = await api.get(
            `/user/profile/badges?userUUID=${userUUID}`,
          );
          const success = response.data.success;
          if (success) {
            const badges = response.data.data;
            return { success, badges };
          }
          return { success };
        },
      },
      get: {
        /**
         * Get user's profile information by handle.
         * @param {String} handle
         * @returns {Object} { success: boolean, user?:{ name?: String, surname?: String, handle?: String, profilePictureUUID?: String, description?: String } }
         */
        async byHandle(handle) {
          const response = await api.get(
            `/user/profile/handle?handle=${handle}`,
            { skipAuth: true },
          );
          const success = response.data.success;
          if (success) {
            const user = response.data.data;
            return { success, user };
          }
          return { success };
        },
      },
    },
  },

  search: {
    /**
     * Search everything (users, chats, bots).
     * @param {String} query
     * @returns {Object} { success: boolean, data?: { users?: Array, chats?: Array, bots?: Array } }
     */
    async all(query) {
      const response = await api.get(`/search/all?query=${query}`);
      const success = response.data.success;
      if (success) {
        const data = response.data.data;
        return { success, data };
      }
      return { success };
    },
  },

  gather: {
    /**
     * Gather information about a user or chat by handle.
     * @param {String} query
     * @param {boolean} detailed - If true, fetch more detailed information.
     * @returns {Object} { success: boolean, data?: { uuid?: String, type?: [USER, CHAT], name?: String, surname?: String, handle?: String, profilePictureUUID?: String, chatType?: [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{userUUID?: String, role_id?: Int}]} }
     */
    async handle(query, detailed = false) {
      let response;
      if (detailed) {
        response = await api.get(`/gather/handle?query=${query}`);
      } else {
        response = await api.get(`/gather/handle/essentials?query=${query}`);
      }
      const success = response.data.success;
      if (success) {
        const data = response.data.data;
        return { success, data };
      }
      return { success };
    },
  },

  chat: {
    /**
     * Create a new chat.
     * @param {String} type [DM, CHANNEL, GROUP, FORUM]
     * @param {String} memberUUIDs
     * @param {String} name
     * @param {String} handle
     * @returns { Object } { success: boolean, chat?: { uuid?: String, type? : [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{userUUID?: String, role_id?: Int}]} }
     */
    async create(type, memberUUIDs = [], name = null, handle = null) {
      try {
        if (!type || (type == "DM" && memberUUIDs.length != 1)) {
          throw new Error(
            "Missing required fields for chat creation",
            type,
            memberUUIDs,
          );
        }
        if (handle == "") {
          handle = undefined;
        }
        const response = await api.post("/chat/create", {
          type,
          memberUUIDs,
          name,
          handle,
        });
        const success = response.data.success;
        if (success) {
          const chat = response.data.data.chat;
          const users = response.data.data.users;
          return { success, chat, users };
        }
        return { success };
      } catch (error) {
        console.error("Error in chat.create:", error);
        throw error;
      }
    },
    /**
     * Join a chat by its handle.
     * @param {String} handle
     * @returns { Object } { success: boolean, chat?: { uuid?: String, type? : [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{userUUID?: String, role_id?: Int}]}, messages?: Array[@SamueleOrazioDurante da completare] }
     */
    async join(handle) {
      try {
        if (!handle) {
          throw new Error("Handle is required to join a chat");
        }
        const response = await api.post("/chat/join", { handle });
        const success = response.data.success;
        if (success) {
          const { chat, users } = response.data.data;
          return { success, chat, users };
        }
        return { success };
      } catch (error) {
        console.error("Error in chat.join:", error);
        throw error;
      }
    },
    pin: {
      /**
       * Pin a chat.
       * @param {String} chatUUID
       * @param {Number} position
       * @returns { Object } { success: boolean, position: Number }
       */
      async add(chatUUID, position) {
        try {
          if (!chatUUID) {
            throw new Error("Missing required fields to pin chat");
          }
          const response = await api.put(`/chat/pin`, { chatUUID, position });
          const success = response.data.success;
          const realPosition = response.data.data.position;
          return { success, position: realPosition };
        } catch (error) {
          console.error("Error pinning chat:", error);
          throw error;
        }
      },
      /**
       * Unpin a chat.
       * @param {String} chatUUID
       * @returns { Object } { success: boolean }
       */
      async remove(chatUUID) {
        try {
          if (!chatUUID) {
            throw new Error("Missing required fields to unpin chat");
          }
          const response = await api.delete(`/chat/pin`, {
            data: { chatUUID },
          });
          const success = response.data.success;
          return { success };
        } catch (error) {
          console.error("Error unpinning chat:", error);
          throw error;
        }
      },
    },
  },
  message: {
    /**
     * Retrive a specific message from a specified chat.
     * @param {String} chatUUID
     * @param {String} messageID
     * @returns Promise<{success: boolean, message?: Object}>
     */
    async retrieve(chatUUID, messageID) {
      try {
        if (!chatUUID || !messageID) {
          throw new Error(
            "Missing required fields for retrieving message",
            chatUUID,
            messageID,
          );
        }
        const response = await api.get(
          `/message?chatUUID=${chatUUID}&messageID=${messageID}`,
        );
        const success = response.data.success;
        if (success) {
          const message = response.data.data;
          return { success, message };
        }
        return { success };
      } catch (error) {
        console.error("Error in message.retrieve:", error);
        throw error;
      }
    },
    /**
     * Send a message to a chat.
     * @param {String} chatUUID
     * @param {String} content
     * @param {String} type
     * @param {Array} files { name: String, size: Int, type: String}
     * @returns Promise<{success: boolean, message?: Object}>
     */
    async send(
      chatUUID,
      content = undefined,
      type = "message",
      files = undefined,
      replyTos = undefined,
    ) {
      try {
        if (!chatUUID) {
          throw new Error(
            "Missing required fields for sending message",
            chatUUID,
          );
        }
        const response = await api.post("/message", {
          chatUUID,
          content,
          type,
          files,
          replyTos,
        });
        const success = response.data.success;
        if (success) {
          const message = response.data.data;
          return { success, message };
        }
        return { success };
      } catch (error) {
        console.error("Error in message.send:", error);
        throw error;
      }
    },
    async confirm(messageUUID) {
      try {
        if (!messageUUID) {
          throw new Error(
            "Missing required fields for confirming message",
            messageUUID,
          );
        }
        const response = await api.post("/message/confirm", {
          messageUUID,
        });
        const success = response.data.success;
        const message = response.data.data;
        return { success, message };
      } catch (error) {
        console.error("Error in message.confirm:", error);
        throw error;
      }
    },
    /**
     * Delete a message from a chat.
     * @param {String} chatUUID
     * @param {String} messageID
     * @returns Promise<{success: boolean}>
     */
    async delete(chatUUID, messageID) {
      try {
        if (!chatUUID || !messageID) {
          throw new Error(
            "Missing required fields for deleting message",
            chatUUID,
            messageID,
          );
        }
        console.log(chatUUID, messageID);
        const response = await api.delete("/message", {
          data: {
            chatUUID,
            messageID,
          },
        });
        const success = response.data.success;
        return { success };
      } catch (error) {
        console.error("Error in message.delete:", error);
        throw error;
      }
    },
    /**
     * Edit a message.
     * @param {String} chatUUID
     * @param {String} messageID
     * @param {String} content
     * @returns Promise<{success: boolean}>
     */
    async edit(chatUUID, messageID, content) {
      try {
        if (!chatUUID || !messageID || !content) {
          throw new Error(
            "Missing required fields for editing message",
            chatUUID,
            messageID,
            content,
          );
        }
        const response = await api.patch("/message", {
          chatUUID,
          messageID,
          content,
        });
        const success = response.data.success;
        if (success) {
          return { success };
        }
        return { success };
      } catch (error) {
        console.error("Error in message.edit:", error);
        throw error;
      }
    },
    pin: {
      /**
       * Pin a message.
       * @param {String} chatUUID
       * @param {String} messageID
       * @returns Promise<{success: boolean}>
       */
      async add(chatUUID, messageID) {
        try {
          if (!chatUUID || !messageID) {
            throw new Error(
              "Missing required fields for pinning message",
              chatUUID,
              messageID,
            );
          }
          const response = await api.put("/message/pin", {
            chatUUID,
            messageID,
          });
          const success = response.data.success;
          if (success) {
            return { success };
          }
          return { success };
        } catch (error) {
          console.error("Error in message.pin.add:", error);
          throw error;
        }
      },
      /**
       * Unpin a message.
       * @param {String} chatUUID
       * @param {String} messageID
       * @returns Promise<{success: boolean}>
       */
      async remove(chatUUID, messageID) {
        try {
          if (!chatUUID || !messageID) {
            throw new Error(
              "Missing required fields for unpinning message",
              chatUUID,
              messageID,
            );
          }
          const response = await api.delete("/message/pin", {
            data: {
              chatUUID,
              messageID,
            },
          });
          const success = response.data.success;
          if (success) {
            return { success };
          }
          return { success };
        } catch (error) {
          console.error("Error in message.pin.remove:", error);
          throw error;
        }
      },
    },
    reaction: {
      /**
       * Add a reaction to a message.
       * @param {String} chatUUID
       * @param {String} messageID
       * @param {String} reaction
       * @returns {Promise<{success: boolean, at: Timestamp}>}
       */
      async add(chatUUID, messageID, reaction) {
        try {
          if (!chatUUID || !messageID || !reaction) {
            throw new Error(
              "Missing required fields for adding reaction",
              chatUUID,
              messageID,
              reaction,
            );
          }
          const response = await api.put("/message/reaction", {
            chatUUID,
            messageID,
            reaction,
          });
          const success = response.data.success;
          const at = response.data.data.at;
          if (success) {
            return { success, at };
          }
          return { success };
        } catch (error) {
          console.error("Error in message.reaction.add:", error);
          throw error;
        }
      },
      /**
       * Remove a reaction to a message.
       * @param {String} chatUUID
       * @param {String} messageID
       * @param {String} reaction
       * @returns {Promise<{success: boolean}>}
       */
      async remove(chatUUID, messageID, reaction) {
        try {
          if (!chatUUID || !messageID || !reaction) {
            throw new Error(
              "Missing required fields for removing reaction",
              chatUUID,
              messageID,
              reaction,
            );
          }
          const response = await api.delete("/message/reaction", {
            data: {
              chatUUID,
              messageID,
              reaction,
            },
          });
          const success = response.data.success;
          if (success) {
            return { success };
          }
          return { success };
        } catch (error) {
          console.error("Error in message.reaction.remove:", error);
          throw error;
        }
      },
    },
  },

  file: {
    /**
     * Retrieve a file download URL and metadata by its UUID.uuid: fileFromDB.uuid,
     * @param {String} fileUUID
     * @returns {Object} { success: boolean, downloadURL?: String, expiresAt?: Date, name?: String, size?: Int, mimeType?: String }
     */
    async retrieve(fileUUID) {
      try {
        if (!fileUUID) {
          throw new Error("fileUUID is required to get download URL");
        }
        const response = await api.get(`/file?fileUUID=${fileUUID}`);
        const success = response.data.success;
        if (success) {
          const { downloadURL, name, expiresAt, size, mimeType } =
            response.data.data;
          return { success, downloadURL, expiresAt, name, size, mimeType };
        }
        return { success };
      } catch (error) {
        console.error("Error in file.retrieve:", error);
        throw error;
      }
    },
  },

  comms: {
    /**
     * Retrieve a token for the vocal communication server for a specific chat.
     * @param {String} chatUUID
     * @param {Number} sub - Optional sub identifier for forums
     * @returns {Object} { success: boolean, token?: String, url?: String }
     */
    async getToken(chatUUID, sub = 0) {
      try {
        if (!chatUUID) {
          throw new Error("chatUUID is required to get comms token");
        }
        const response = await api.get(
          `/comms/token?chatUUID=${chatUUID}&sub=${sub}`,
        );
        const success = response.data.success;
        if (success) {
          const { token, url } = response.data.data;
          return { success, token, url };
        }
        return { success };
      } catch (error) {
        console.error("Error in comms.getToken:", error);
        throw error;
      }
    },
    room: {
      async get(chatUUID, sub = 0) {
        try {
          if (!chatUUID) {
            throw new Error("chatUUID is required to get comms room");
          }
          const response = await api.get(
            `/comms/room?chatUUID=${chatUUID}&sub=${sub}`,
          );
          const success = response.data.success;
          if (success) {
            console.log("comms room response data:", response.data);
            const roomInfo = response.data.data.roomInfo;
            const remoteParticipants = response.data.data.participants;
            const room = {
              roomInfo,
              remoteParticipants,
            };
            return { success, room };
          }
          return { success };
        } catch (error) {
          if (error.response && error.response.status === 404) {
            return { success: true, room: [] };
          }
          console.error("Error in comms.room.get:", error);
          throw error;
        }
      },
    },
  },

  notification: {
    /**
     * Set the Expo push token for the current user.
     * @param {String} token
     * @returns {Promise<boolean>}
     */
    async setExpoToken(token) {
      try {
        if (!token) {
          throw new Error("token is required to set expo token");
        }
        const response = await api.patch("/notification/expo-push-token", {
          token,
        });
        return response.data.success;
      } catch (error) {
        console.error("Error in notification.setExpoToken:", error);
        throw error;
      }
    },
  },
};
export default gateway;
