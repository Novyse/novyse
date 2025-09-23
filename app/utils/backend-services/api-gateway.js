import axios, { all } from "axios";
import eventEmitter from "../EventEmitter.js";
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

const domain = "http://localhost:80"; //API_BASE_URL; @SamueleOrazioDurante per ora in locale, poi metti API_BASE_URL
const APIlink = domain + path;

const api = axios.create({
  baseURL: APIlink,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "X-Operating-System": Platform.OS,
    "X-App-Version": APP_VERSION,
  },
});

// Middlewares

/**
 * Unauthorized middleware that emits an event when a 401 response is received.
 * This can be used to handle session expiration or unauthorized access globally.
 * If an 401 is detected, it tries to regenerate the access token. If it fails, it emits an "invalidSession" event.
 */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      if (!gateway.auth.refresh()) {
        // Cant regenerate access token, emit invalid session
        console.error("Session expired and cannot refresh token.");
        eventEmitter.emit("invalidSession");
      }
    } else if (status === 500) {
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
          if (accessToken) {
            await token.setAccessToken(accessToken);
            return success;
          }
        }

        return success;
      } catch (error) {
        console.error("Error in refresh:", error);
        throw error;
      }
    },

    /**
     * Logout the user by invalidating the refresh token. It also clears all local data.
     * @returns {boolean} true if the logout was successful, false otherwise
     */

    async logout() {
      const refreshToken = null; // @SamueleOrazioDurante prende da async storage il refresh token

      if (!refreshToken) {
        console.error("No refresh token available");
        eventEmitter.emit("invalidSession");
      }

      const response = await api.post("/auth/logout", { refreshToken });
      const success = response.data.success;

      if (success) {
        console.info("Logged out successfully");
        eventEmitter.emit("invalidSession");
        // @SamueleOrazioDurante da creare un metodo che distrugga tutto, database, asyncstorage, cache, qualsiasi cosa, che verrà usato anche per forzare la disconessione in futuro insieme all'invalidSession event
      }
      return success;
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
      return success;
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
      return success;
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
     * @returns {Object} { success: boolean, user?:{ uuid?: String, email?: String, name?: String, surname?: String, handle?: String}, device?:{uuid?: String}, chats?: Array[{uuid?: String, type? : [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{user_uuid?: String, role_id?: Int}]}], messages?: Array[@SamueleOrazioDurante da completare]}
     */
    async initialize() {
      const response = await api.get("/user/initialize");
      const success = response.data.success;
      if (success) {
        const { user, device, chats, messages } = response.data.data;
        return { success, user, device, chats, messages };
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
     * @returns {Object} { success: boolean, data?: { uuid?: String, type?: [USER, CHAT], name?: String, surname?: String, handle?: String, profilePictureUUID?: String, chatType?: [DM, CHANNEL, GROUP, FORUM], created_at?: timestamp, members?: Array[{user_uuid?: String, role_id?: Int}]} }
     */
    async handle(query) {
      const response = await api.get(`/gather/handle?query=${query}`);
      const success = response.data.success;
      if (success) {
        const data = response.data.data;
        return { success, data };
      }
      return { success };
    },
  },

  chat: {
    async create(type, memberUUIDs = [], name = null, handle = null) {
      try {
        if (!type || (type == "DM" && memberUUIDs.length != 1)) {
          throw new Error("Missing required fields for chat creation");
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
  },

  // DEPRECATED ------------------------------------

  // chiede all'API se l'email è già registrata
  async emailCheckAPI(email) {
    try {
      const response = await api.get(`/user/auth/access?email=${email}`);
      return response;
    } catch (error) {
      console.error("Error in emailCheckAPI:", error);
      throw error;
    }
  },

  // chiede registrazione all'API
  async signupAPI(
    email,
    name,
    surname,
    handle,
    password,
    privacy_policy_accepted,
    terms_of_service_accepted
  ) {
    try {
      const response = await api.get(
        `/user/auth/signup?email=${email}&name=${name}&surname=${surname}&handle=${handle}&password=${password}&privacy_policy_accepted=${privacy_policy_accepted}&terms_of_service_accepted=${terms_of_service_accepted}`
      );
      return response;
    } catch (error) {
      console.error("Error in signupAPI:", error);
      throw error;
    }
  },

  // controlla che l'handle sia disponibile
  async handleAvailability(handle) {
    try {
      const response = await api.get(
        `/user/data/check/handle-availability?handle=${handle}`
      );
      //console.log("handleAvailability in APImethods: ", response);
      return response;
    } catch (error) {
      console.error("Error in handleAvailability:", error);
      throw error;
    }
  },

  // Chiede tutto all'API (search)
  async searchAll(value) {
    try {
      const response = await api.get(`/user/data/search/all?handle=${value}`);
      console.log("searchAll in APImethods: ", response);
      return response;
    } catch (error) {
      console.error("Error in searchAll in APImethods:", error);
      throw error;
    }
  },

  // chiede il login all'API
  async loginAPI(email, password) {
    try {
      const response = await api.get(
        `/user/auth/login?email=${email}&password=${password}`
      );

      return response.data;
    } catch (error) {
      console.error("Error in loginAPI:", error);
      throw error;
    }
  },

  // chiedi all'API di generare il token per il QR Code
  async generateQRCodeTokenAPI() {
    try {
      const response = await api.get("/user/auth/qr_code/generate");

      const data = response.data;
      if (!data || !data.qr_code_generated) {
        console.error("QR Code generation failed:", data);
        return null;
      }
      return data.qr_token;
    } catch (error) {
      console.error("Error in generateQRCodeTokenAPI:", error);
      throw error;
    }
  },

  // chiede all'API di scansionare il QR Code
  async scanQRCodeAPI(qr_token) {
    try {
      const response = await api.get(
        `/user/auth/qr_code/scan?qr_token=${qr_token}`
      );
      return response.data.qr_code_scanned;
    } catch (error) {
      if (error.response && error.response.data) {
        // QR Code non valido o già scansionato
        return false;
      } else {
        // Errore di rete, timeout, o risposta completamente assente
        console.error(
          "Error in scanQRCodeAPI: Nessuna risposta dal server",
          error.message
        );
        throw error; // Rilancia l'errore per gestirlo a livello superiore
      }
    }
  },

  // chiede all'API di verificare se il token del QR Code è stato scansionato
  async checkQRCodeScannedAPI(qr_token) {
    try {
      const response = await api.get(
        `/user/auth/qr_code/check?qr_token=${qr_token}`
      );

      return response;
    } catch (error) {
      console.error("Error in checkQRCodeScannedAPI:", error);
      throw error;
    }
  },

  //chiede init all'API
  async initAPI() {
    try {
      const response = await api.get("/user/data/get/init");

      return response;
    } catch (error) {
      console.error("Error in initAPI:", error);
      throw error;
    }
  },

  // quando un messaggio viene inviato all'API, questa ritorna info utili al messaggio da salvare in locale
  async sendMessageAPI(chat_id, text) {
    try {
      // edited message to encode the URLs
      text = text
        .replace(/http:\/\//g, "http%3A%2F%2F")
        .replace(/https:\/\//g, "https%3A%2F%2F");

      const response = await api.get(
        `/chat/send/message?chat_id=${chat_id}&text=${text}`
      );
      return response;
    } catch (error) {
      console.error("Error in sendMessageAPI:", error);
      throw error;
    }
  },

  // ottiene i membri di una chat
  async getChatMembers(chat_id) {
    try {
      const response = await api.get(`/chat/get/members?chat_id=${chat_id}`);
      return response.data.members_list;
    } catch (error) {
      console.error("Error in getChatMembers API:", error);
      throw error;
    }
  },

  // effettua il logout
  async logoutAPI() {
    try {
      const response = await api.get("/user/auth/logout");
      return response.data.logged_out;
    } catch (error) {
      // if (response.status === 401) {
      //   return true;
      // } else {
      //   console.error("Error in logout API:", error);
      //   throw error;
      // }
      return true;
    }
  },

  //creazione nuova chat
  async createNewChatAPI(handle) {
    try {
      const response = await api.get(`/chat/create/chat?handle=${handle}`);
      return response.data.chat_id;
    } catch (error) {
      console.error("Error in createNewChatAPI:", error);
      throw error;
    }
  },

  //creazione gruppo
  async createNewGroupAPI(handle, name, members) {
    try {
      const response = await api.get(
        `/chat/create/group?handle=${handle}&name=${name}`
      );
      return response.data;
    } catch (error) {
      console.error("Error in createNewGroupAPI:", error);
      throw error;
    }
  },

  // join gruppo
  async joinGroup(handle) {
    try {
      const response = await api.get(`/chat/join/group?handle=${handle}`);
      return response.data;
    } catch (error) {
      console.error("Error in joinGroupAPI:", error);
      throw error;
    }
  },

  // update rispetto all'ultimo evento dal websocket
  async updateAll(date_time) {
    try {
      const response = await api.get(
        `/user/data/get/update?latest_update_datetime=${date_time}`
      );
      return response;
    } catch (error) {
      console.error("Error in updateAll:", error);
      throw error;
    }
  },

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

  async forgotPassword(email) {
    try {
      const response = await api.get(
        `/user/auth/forgot-password?email=${email}`
      );
      return response.data.forgot_password; // ritorna forgot_password : true/false
    } catch (error) {
      console.error("Error in forgotPassword:", error);
      throw error;
    }
  },

  async resetPassword(email, token, password) {
    try {
      const response = await api.get(
        `/user/auth/reset-password?email=${email}&token=${token}&password=${password}`
      );
      return response.data.reset_password; // ritorna reset_password : true/false
    } catch (error) {
      console.error("Error in resetPassword:", error);
      throw error;
    }
  },

  async changePassword(old_password, new_password) {
    try {
      const response = await api.get(
        `/user/auth/change-password?old_password=${old_password}&new_password=${new_password}`
      );
      return response.data.change_password; // ritorna change_password : true/false
    } catch (error) {
      console.error("Error in changePassword:", error);
      throw error;
    }
  },

  async twoFactorsAuth(method, token, code) {
    try {
      const response = await api.get(
        `/user/auth/2fa/verify?method=${method}&token=${token}&code=${code}`
      );
      return response.data; // ritorna data : token sessione e authenticated true/false
    } catch (error) {
      console.error("Error in twoFactorsAuth:", error);
      throw error;
    }
  },

  async getTwofaMethods() {
    try {
      const response = await api.get(`/user/auth/2fa/get`);
      return response.data; // ritorna data : two_fa_active_methods, two_fa_methods
    } catch (error) {
      console.error("Error in get 2fa methods:", error);
      throw error;
    }
  },

  async removeTwofaMethod(method) {
    try {
      const response = await api.get(`/user/auth/2fa/remove?method=${method}`);
      return response.data; // ritorna data : two_fa_remove_method true/false, token
    } catch (error) {
      console.error("Error in get 2fa remove method:", error);
      throw error;
    }
  },

  async addTwofaMethod(method) {
    try {
      const response = await api.get(`/user/auth/2fa/add?method=${method}`);
      return response.data; // ritorna data : two_fa_add_method true/false, token
    } catch (error) {
      console.error("Error in get 2fa remove method:", error);
      throw error;
    }
  },

  async twofaSelect(token, method) {
    try {
      const response = await api.get(
        `/user/auth/2fa/select?method=${method}&token=${token}`
      );
      return response.data; // ritorna data : two_fa_select true/false
    } catch (error) {
      console.error("Error in get twofaSelect:", error);
      throw error;
    }
  },
};

export default gateway;
