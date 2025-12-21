import axios, { all } from "axios";
import eventEmitter from "../global/Events/lib/EventEmitter.js";
import { Platform } from "react-native";

import token from "../welcome/token.js";

import { BRANCH, API_BASE_URL, APP_VERSION } from "../../../app.config.js";

let path;

switch (BRANCH) {
  case "development":
    path = "/development";
    break;
  case "preview":
    path = "/preview";
    break;
  default:
    path = "/production";
}

const domain = API_BASE_URL;
const APIlink = domain + path;

const api = axios.create({
  baseURL: APIlink,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "x-operating-system": Platform.OS,
    "x-app-version": APP_VERSION,
  },
});

// Middlewares

/**
 * Unauthorized middleware that emits an event when a 401 response is received.
 * This can be used to handle session expiration or unauthorized access globally.
 * If an 401 is detected, it tries to regenerate the access token. If it fails, it emits an "invalidSession" event.
 */

let isRefreshing = false;
let isRefreshingAuth = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 || error.response?.status === 403) {
      if (
        error.response.status === 401 &&
        ((originalRequest.url === "/auth/login" &&
          originalRequest.method.toLowerCase() === "post") ||
          (originalRequest.url === "/auth/logout" &&
            originalRequest.method.toLowerCase() === "post") ||
          (originalRequest.url === "/auth/refresh" &&
            originalRequest.method.toLowerCase() === "post") ||
          // TEMPORARY FIX
          (originalRequest.url === "/auth/qrcode/check" &&
            originalRequest.method.toLowerCase() === "post"))
      ) {
        // For login or logout requests with 401, skip token refresh and reject
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshSuccess = await gateway.auth.refresh();
        if (refreshSuccess) {
          const newAccessToken = await token.getAccessToken();
          processQueue(null, newAccessToken);
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } else {
          processQueue(error, null);
          eventEmitter.emit("invalidSession");
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        eventEmitter.emit("invalidSession");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    } else if (error.response?.status === 500) {
      console.error("Server error 500:", error.response?.data || error.message);
      eventEmitter.emit("serverError");
    }
    return Promise.reject(error);
  }
);

/**
 * Attach the access token to every request if available.
 * This ensures that authenticated endpoints can be accessed without manually adding the token each time.
 */

api.interceptors.request.use(async (request) => {
  const accessToken = await token.getAccessToken();
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
  console.log(
    `Starting Request: ${request.method.toUpperCase()} ${request.url}`,
    request.params || {},
    request.data || {}
  );
  return request;
});

api.interceptors.response.use((response) => {
  console.log(
    `Response: ${response.config.method.toUpperCase()} ${response.config.url}`,
    response.data || {}
  );
  return response;
});

const gateway = {
  auth: {
    /**
     * Register a new user.
     * @param {String} email
     * @param {String} password
     * @param {String} name
     * @param {String} surname
     * @param {String} handle
     * @param {boolean} privacy_policy_accepted
     * @param {boolean} terms_of_service_accepted
     * @returns {boolean} true if registration was successful, false otherwise
     */
    async register(
      email,
      password,
      name,
      surname,
      handle,
      privacy_policy_accepted,
      terms_of_service_accepted
    ) {
      try {
        if (!email || !password || !name || !surname || !handle) {
          throw new Error("Missing required fields for registration");
        }
        if (
          privacy_policy_accepted !== true ||
          terms_of_service_accepted !== true
        ) {
          throw new Error(
            "Privacy policy and terms of service must be accepted"
          );
        }

        const response = await api.post("/auth/register", {
          email,
          password,
          name,
          surname,
          handle,
          acceptTerms: privacy_policy_accepted,
          acceptPrivacy: terms_of_service_accepted,
        });
        const success = response.data.success;
        return success;
      } catch (error) {
        console.error("Error in register:", error);
        throw error;
      }
    },

    /**
     * Login a user. Returns whether 2FA is required.
     * @param {String} email
     * @param {String} password
     * @returns {Object} { success: boolean, twofa: boolean, choose: boolean, methods?: Array, twoFactorToken?: String, chooseTwoFactorToken?: String, expiresIn?: Number }
     */

    async login(email, password) {
      try {
        if (!email || !password) {
          throw new Error("Email and password are required for login");
        }
        const response = await api.post("/auth/login", { email, password });

        const success = response.data.success;
        if (success) {
          const twofa = response.data.data.twofa;
          if (twofa) {
            // 2FA REQUIRED
            const { methods, expiresIn } = response.data.data;

            const chooseTwoFactorToken =
              response.data.data.chooseTwoFactorToken;
            const twoFactorToken = response.data.data.twoFactorToken;

            let choose = false;
            if (chooseTwoFactorToken && !twoFactorToken) {
              // Need to select 2FA method
              choose = true;
            }

            return {
              success,
              twofa,
              choose,
              methods,
              twoFactorToken,
              chooseTwoFactorToken,
              expiresIn,
            };
          } else {
            const { accessToken, refreshToken } = response.data.data;
            if (accessToken && refreshToken) {
              // LOGIN SUCCESS WITHOUT 2FA
              await token.setBothTokens(accessToken, refreshToken);
            }
          }
        }
        return { success, twofa: false };
      } catch (error) {
        console.error("Error in login:", error);
        throw error;
      }
    },

    /**
     *
     * @param {String} chooseTwoFactorToken
     * @param {String} method
     * @returns {Object} { success: boolean, method?: String, twoFactorToken?: String, expiresIn?: Number}
     */

    async chooseTwofaMethod(chooseTwoFactorToken, method) {
      try {
        if (!chooseTwoFactorToken || !method) {
          throw new Error("chooseTwoFactorToken and method are required");
        }
        const response = await api.post("/auth/twofa/choose", {
          chooseTwoFactorToken,
          method,
        });
        const success = response.data.success;

        if (success) {
          const { method, twoFactorToken, expiresIn } = response.data.data;

          return {
            success,
            method,
            twoFactorToken,
            expiresIn,
          };
        }

        return { success };
      } catch (error) {
        console.error("Error in chooseTwofaMethod:", error);
        throw error;
      }
    },

    /**
     * Verify the 2FA code. Can be used for both login and enabling/disabling 2FA.
     * @param {String} twoFactorToken
     * @param {String} code
     * @returns {boolean} true if the 2FA code was successfully verified, false otherwise
     */

    async verifyTwofaCode(twoFactorToken, code) {
      try {
        if (!twoFactorToken || !code) {
          throw new Error("twoFactorToken and code are required");
        }
        const response = await api.post("/auth/twofa/verify", {
          twoFactorToken,
          code,
        });
        const success = response.data.success;
        if (success) {
          const { accessToken, refreshToken } = response.data.data;
          if (accessToken && refreshToken) {
            // Was successful 2FA LOGIN
            await token.setBothTokens(accessToken, refreshToken);
          }
        }
        return success;
      } catch (error) {
        console.error("Error in verifyTwofaCode:", error);
        throw error;
      }
    },

    /**
     * Resend the 2FA code. Only for methods that support it ( only email for now, will support SMS in future).
     * @param {String} twoFactorToken
     * @returns {Object} { success: boolean, twoFactorToken?: String, expiresIn?: Number }
     */

    async resendTwofaCode(twoFactorToken) {
      try {
        if (!twoFactorToken) {
          throw new Error("twoFactorToken is required");
        }
        const response = await api.post("/auth/twofa/resend", {
          twoFactorToken,
        });
        const success = response.data.success;

        if (success) {
          const { twoFactorToken, expiresIn } = response.data.data;
          return { success, twoFactorToken, expiresIn };
        }

        return { success };
      } catch (error) {
        console.error("Error in resendTwofaCode:", error);
        throw error;
      }
    },

    /**
     * Refresh the access token using a refresh token.
     * @returns {boolean} true if the token was successfully refreshed, false otherwise
     */

    async refresh() {
      if (isRefreshingAuth) {
        // Prevent multiple simultaneous refresh calls
        return false;
      }
      isRefreshingAuth = true;
      try {
        const refreshToken = await token.getRefreshToken();

        if (!refreshToken) {
          console.error("No refresh token available");
          eventEmitter.emit("invalidSession");
        }

        const response = await api.post("/auth/refresh", { refreshToken });
        const success = response.data.success;

        if (success) {
          const accessToken = response.data.data.accessToken;
          const refreshToken = response.data.data.refreshToken;
          if (accessToken && refreshToken) {
            await token.setBothTokens(accessToken, refreshToken);
            return success;
          }
        }

        return success;
      } catch (error) {
        console.error("Error in refresh:", error);
        throw error;
      } finally {
        isRefreshingAuth = false;
      }
    },

    /**
     * Logout the user by invalidating the refresh token. It also clears all local data.
     * @returns {boolean} true if the logout was successful, false otherwise
     */

    async logout() {
      try {
        const refreshToken = await token.getRefreshToken();

        if (!refreshToken) {
          console.error("No refresh token available");
          return false;
        }

        const response = await api.post("/auth/logout", { refreshToken });
        const success = response.data.success;

        if (success) {
          console.info("Logged out successfully on API level");
        }
        return success;
      } catch (error) {
        console.error("Error in logout:", error);
        return false;
      }
    },

    /**
     * Add a new 2FA method.
     * @param {String} method
     * @returns { Object } { success: boolean, method?: String, twoFactorToken?: String, expiresIn?: Number, secret?: String, otpauth?: String }
     */

    async addTwofaMethod(method) {
      const response = await api.post("/auth/twofa/add", { method });
      const success = response.data.success;
      if (success) {
        const { method, twoFactorToken, expiresIn } = response.data.data;
        if (method == "authenticator") {
          const { secret, otpauth } = response.data.data;
          return {
            success,
            method,
            twoFactorToken,
            expiresIn,
            secret,
            otpauth,
          };
        }
        return { success, method, twoFactorToken, expiresIn };
      }
      return { success };
    },
    /**
     * Remove a 2FA method.
     * @param {String} method
     * @returns {Object} { success: boolean, method?: String, twoFactorToken?: String, expiresIn?: Number }
     */
    async removeTwofaMethod(method) {
      const response = await api.delete("/auth/twofa/remove", {
        data: { method },
      });
      const success = response.data.success;
      if (success) {
        const { method, twoFactorToken, expiresIn } = response.data.data;
        return { success, method, twoFactorToken, expiresIn };
      }
      return { success };
    },

    /**
     * Get available and active 2FA methods for the user.
     * @returns {Object} { success: boolean, methods?: Array, activeMethods?: Array }
     */
    async getTwofaMethods() {
      const response = await api.get("/auth/twofa");

      const success = response.data.success;
      if (success) {
        const methods = response.data.data.methods;
        const activeMethods = response.data.data.activeMethods;
        return { success, methods, activeMethods };
      }
      return { success };
    },
    /**
     * Get 2FA recovery codes.
     * @returns {Object} { success: boolean, codes?: Array }
     */
    async getTwofaRecoverCodes() {
      const response = await api.get("/auth/twofa/codes");
      const success = response.data.success;
      if (success) {
        const codes = response.data.data.codes;
        return { success, codes };
      }
      return { success };
    },
    /**
     * Regenerate 2FA recovery codes, invalidating the previous ones.
     * @returns {boolean} true if the recovery codes were successfully regenerated, false otherwise
     */
    async regenerateTwofaRecoverCodes() {
      const response = await api.post("/auth/twofa/codes/generate");
      const success = response.data.success;
      return success;
    },
    /**
     * Change the user's password.
     * @param {String} currentPassword
     * @param {String} newPassword
     * @returns {boolean} true if the password was successfully changed, false otherwise
     */
    async changePassword(currentPassword, newPassword) {
      const response = await api.post("/auth/password/change", {
        currentPassword,
        newPassword,
      });
      const success = response.data.success;
      return success;
    },
    /**
     * Request a password reset email.
     * @param {String} email
     * @returns {boolean} true if the password reset email was successfully sent, false otherwise
     */
    async requestPasswordReset(email) {
      const response = await api.post("/auth/reset/password/request", {
        email,
      });
      const success = response.data.success;
      return true;
    },
    /**
     *
     * @param {String} email
     * @param {String} resetToken
     * @param {String} newPassword
     * @returns {boolean} true if the password was successfully reset, false otherwise
     */
    async resetPassword(email, resetToken, newPassword) {
      const response = await api.post("/auth/reset/password", {
        email,
        resetToken,
        newPassword,
      });
      const success = response.data.success;
      return true;
    },
    /**
     * Request a QR code token for login.
     * @returns {Object} { success: boolean, qrCodeToken?: String, expiresIn?: Number }
     */
    async generateQRCodeToken() {
      const response = await api.get("/auth/qrcode/generate");
      const success = response.data.success;
      if (success) {
        const { qrCodeToken, expiresIn } = response.data.data;
        return { success, qrCodeToken, expiresIn };
      }
      return { success };
    },
    /**
     *
     * @param {String} qrCodeToken
     * @returns {boolean} true if the QR code token was successfully scanned, false otherwise
     */
    async scanQRCodeToken(qrCodeToken) {
      const response = await api.post("/auth/qrcode/scan", { qrCodeToken });
      const success = response.data.success;
      return success;
    },
    /**
     * Check the status of a QR code token.
     * @param {String} qrCodeToken
     * @returns {Object} { success: boolean, scanned: boolean }
     */
    async checkQRCodeToken(qrCodeToken) {
      const response = await api.post("/auth/qrcode/check", { qrCodeToken });
      const success = response.data.success;
      if (success) {
        const status = response.data.data.status; // pending, scanned
        if (status == "pending") {
          // QR code is still pending
          return { success, scanned: false };
        } else {
          // QR code was scanned
          const { accessToken, refreshToken } = response.data.data;
          if (accessToken && refreshToken) {
            await token.setBothTokens(accessToken, refreshToken);
          }
          return {
            success,
            scanned: true,
          };
        }
      }
      return { success };
    },
  },

  check: {
    /**
     * Check if a handle is available.
     * @param {String} handle
     * @returns {Object} { success: boolean, free?: boolean }
     */
    async handle(handle) {
      const response = await api.get(`/check/handle?handle=${handle}`);
      const success = response.data.success;
      if (success) {
        const free = response.data.data.free;
        return { success, free };
      }
      return { success };
    },

    /**
     * Check if an email is available.
     * @param {String} email
     * @returns {Object} { success: boolean, free?: boolean }
     */
    async email(email) {
      const response = await api.get(`/check/email?email=${email}`);
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
     * @returns {Object} { success: boolean, lastUpdateTime: String, user?:{ uuid?: String, email?: String, name?: String, surname?: String, handle?: String}, device?:{uuid?: String}, chats?: Array[{uuid?: String, type? : [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{userUUID?: String, role_id?: Int}]}], messages?: Array[@SamueleOrazioDurante da completare]}
     */
    async initialize() {
      const response = await api.get("/user/initialize");
      const success = response.data.success;
      if (success) {
        const { lastUpdateTime, user, device, chats, messages } =
          response.data.data;
        return { success, lastUpdateTime, user, device, chats, messages };
      }
      return { success };
    },

    /**
     * Update user data since last update time.
     * @param {Timestamp} lastUpdateTime
     * @returns {Object} { success: boolean, user?:{ uuid?: String, email?: String, name?: String, surname?: String, handle?: String}, chats?: Array[{uuid?: String, type? : [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{userUUID?: String, role_id?: Int}]}], messages?: Array[@SamueleOrazioDurante da completare]}
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
        `/user/update?lastUpdateTime=${lastUpdateTime}`
      );
      const success = response.data.success;
      if (success) {
        const { user, chats, messages } = response.data.data;
        return { success, user, chats, messages };
      }
      return { success };
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
     * @param {String} type
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
            memberUUIDs
          );
        }
        const response = await api.post("/chat/create", {
          type,
          memberUUIDs,
          name,
          handle,
        });
        const success = response.data.success;
        if (success) {
          const chat = response.data.data;
          return { success, chat };
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
          const { chat, messages } = response.data.data;
          return { success, chat, messages };
        }
        return { success };
      } catch (error) {
        console.error("Error in chat.join:", error);
        throw error;
      }
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
            messageID
          );
        }
        const response = await api.get(
          `/message?chatUUID=${chatUUID}&messageID=${messageID}`
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
      files = undefined
    ) {
      try {
        if (!chatUUID) {
          throw new Error(
            "Missing required fields for sending message",
            chatUUID
          );
        }
        const response = await api.post("/message", {
          chatUUID,
          content,
          type,
          files,
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
            messageUUID
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
    async delete(messageUUID) {
      try {
        if (!messageUUID) {
          throw new Error(
            "Missing required fields for deleting message",
            messageUUID
          );
        }
        const response = await api.delete("/message", {
          messageUUID,
        });
        const success = response.data.success;
        return { success };
      } catch (error) {
        console.error("Error in message.delete:", error);
        throw error;
      }
    },
    async modify(messageUUID, newContent) {
      try {
        if (!messageUUID || !newContent) {
          throw new Error(
            "Missing required fields for modifying message",
            messageUUID,
            newContent
          );
        }
        const response = await api.patch("/message", {
          messageUUID,
          newContent,
        });
        const success = response.data.success;
        if (success) {
          const message = response.data.data;
          return { success, message };
        }
        return { success };
      } catch (error) {
        console.error("Error in message.modify:", error);
        throw error;
      }
    },
  },

  /**
   * Handle Socket.IO authentication errors by attempting to refresh the token.
   * If the refresh is successful, it emits an event to reconnect the socket with the new token.
   * If the refresh fails, it emits an "invalidSession" event.
   */
  async handleSocketAuthError() {
    try {
      const refreshSuccess = await gateway.auth.refresh();
      if (refreshSuccess) {
        // Emit an event to notify that the socket should reconnect with the new token
        eventEmitter.emit("socketReconnect");
      } else {
        // If refresh fails, emit invalidSession as before
        eventEmitter.emit("invalidSession");
      }
    } catch (error) {
      console.error("Error refreshing token for socket:", error);
      eventEmitter.emit("invalidSession");
    }
  },

  // @SamueleOrazioDurante da qua
  // quando uno user vuole entrare in una chat vocale
  async commsJoin(chatId) {
    try {
      const response = await api.get(`/comms/join?chat_id=${chatId}`);
      return response.data;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

  // quando uno user vuole abbandonare una chat vocale
  async commsLeave() {
    try {
      const response = await api.get(`/comms/leave`);
      return response.data;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

  // quando lo user richiede chi è in una chat vocale
  async retrieveVocalUsers(chatId) {
    try {
      return {};
      const response = await api.get(`/comms/get/members?chat_id=${chatId}`);
      const commsData = {};

      response.data.comms_members_list.forEach((member) => {
        if (!commsData[member.from]) {
          commsData[member.from] = {
            userData: {
              handle: member.handle,
              isSpeaking: member.is_speaking,
              webcamOn: member.webcam_on,
            },
            activeScreenShares: [],
          };
        }

        if (member.active_screen_share) {
          commsData[member.from].activeScreenShares.push(
            ...member.active_screen_share
          );
        }
      });

      return commsData;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

  async startScreenShare(chatId) {
    try {
      const response = await api.get(
        `/comms/screen_share/start?chat_id=${chatId}`
      );
      return response.data; // ritorna screen_share_started : true/false e screen_share_uuid
    } catch (error) {
      console.error("Error in startStream:", error);
      throw error;
    }
  },

  async stopScreenShare(chatId, screenShareUUID) {
    try {
      const response = await api.get(
        `/comms/screen_share/stop?chat_id=${chatId}&screen_share_uuid=${screenShareUUID}`
      );
      return response.data; // ritorna screen_share_stopped : true/false
    } catch (error) {
      console.error("Error in stopStream:", error);
      throw error;
    }
  },
};
export default gateway;
