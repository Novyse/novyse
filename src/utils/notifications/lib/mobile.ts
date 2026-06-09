import notifee, {
  AndroidStyle,
  AndroidImportance,
  EventType,
  Notification,
  NotificationAndroid,
  AndroidMessagingStyle,
  AndroidCategory,
  AndroidBadgeIconType,
  AndroidChannel,
  AndroidPerson,
  EventDetail,
} from "react-native-notify-kit";
import { Platform, DeviceEventEmitter } from "react-native";
import { router } from "expo-router";
import { DateTime } from "luxon";
import messageFormat from "../../chat/messageFormat";
import i18n from "../../../i18n";
import { useActiveChatStore } from "../../../context/ActiveChatContext";

class MobileNotificationManager {
  private processedMessageIds = new Set<string>();

  constructor() {
    this.setupChannels();
    this.setupActionListeners();
  }

  async setupChannels() {
    if (Platform.OS !== "android") return;

    try {
      await notifee.createChannel({
        id: "chat_messages",
        name: "Chat Messages",
        importance: AndroidImportance.HIGH,
        vibration: true,
      });
      console.log(
        "[MobileNotificationManager] Channel 'chat_messages' created/verified.",
      );

      const settings = await notifee.getNotificationSettings();
      console.log(
        "[MobileNotificationManager] Notification permissions status:",
        settings.authorizationStatus,
      );
    } catch (e) {
      console.error("[MobileNotificationManager] Error in setupChannels:", e);
    }
  }

  setupActionListeners() {
    notifee.onForegroundEvent(async ({ type, detail }) => {
      this.handleEvent(type, detail);
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      this.handleEvent(type, detail);
    });
  }

  private async handleEvent(type: EventType, detail: EventDetail) {
    const { notification, pressAction } = detail;

    switch (type) {
      case EventType.PRESS:
        const chatUUID = notification?.data?.chatUUID;
        if (chatUUID) {
          const activeStore = useActiveChatStore.getState();
          await activeStore.setSelectedChatUUID(chatUUID as string);
          if (notification.id === "novyse_comms_persistent") {
            activeStore.setContentView("vocal");
          } else {
            activeStore.setContentView("chat");
          }
        }
        if (notification?.id) {
          await notifee.cancelNotification(notification.id);
        }
        break;

      case EventType.ACTION_PRESS:
        if (pressAction?.id === "decline_call") {
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
        } else if (pressAction?.id === "answer_call") {
          const chatUUID = notification?.data?.chatUUID;
          if (chatUUID) {
            const activeStore = useActiveChatStore.getState();
            await activeStore.setSelectedChatUUID(chatUUID as string);
            activeStore.setContentView("vocal");
          }
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
        } else if (pressAction?.id === "toggle_mic") {
          DeviceEventEmitter.emit("comms_toggle_mic");
        } else if (pressAction?.id === "toggle_cam") {
          DeviceEventEmitter.emit("comms_toggle_cam");
        } else if (pressAction?.id === "leave_voice") {
          DeviceEventEmitter.emit("comms_leave_voice");
        }
        break;
    }
  }

  async displayMessage(remoteMessage: any) {
    if (Platform.OS === "web") return;

    const { data } = remoteMessage;
    if (!data) return;

    console.log(
      "[MobileNotificationManager] displayMessage called with data:",
      JSON.stringify(data),
    );

    try {
      // 1. Ensure permissions
      const settings = await notifee.getNotificationSettings();
      console.log(
        "[MobileNotificationManager] Permission status:",
        settings.authorizationStatus,
      );

      // 2. Ensure channel exists (idempotent)
      const channelId = "novyse_chat_messages";
      const channelSettings: AndroidChannel = {
        id: channelId,
        name: "Chat Messages",
        importance: AndroidImportance.HIGH,
        vibration: true,
        badge: true,
      };
      await notifee.createChannel(channelSettings);

      const chatUUID = data.chatUUID;

      // --- 2.5 Resolve Message Data ---
      let messageData: any = null;
      if (data.message) {
        if (typeof data.message === "string") {
          try {
            messageData = JSON.parse(data.message);
          } catch (e) {
            console.error("[MobileNotificationManager] Parse failed:", e);
          }
        } else {
          messageData = data.message;
        }
      }

      // --- 2.6 Deduplication ---
      const internalId = String(
        messageData?.id || data.messageId || data.id || Date.now(),
      );

      if (this.processedMessageIds.has(internalId)) {
        console.log(
          `[MobileNotificationManager] Duplicate message ${internalId} ignored.`,
        );
        return;
      }
      this.processedMessageIds.add(internalId);
      if (this.processedMessageIds.size > 100) {
        const first = this.processedMessageIds.values().next().value;
        if (first !== undefined) this.processedMessageIds.delete(first);
      }

      // --- 2.7 Resolve context data (Store + DB Fallback) ---
      const useChatStore = (await import("@/src/context/ChatContext")).default;
      const useUserStore = (await import("@/src/context/UserContext")).default;
      const database = (await import("../../storage/database")).default;

      // Ensure DB is connected in Headless mode (when UI SQLiteProvider is not mounted)
      if (!database.file.db) {
        const SQLite = await import("expo-sqlite");
        database.setDb(SQLite.openDatabaseSync("novyse"));
      }

      // Ensure Network Context knows we are online in Headless mode
      const useNetworkStore = (await import("@/src/context/NetworkContext"))
        .default;
      if (!useNetworkStore.getState().isConnected) {
        const NetInfo = (await import("@react-native-community/netinfo"))
          .default;
        const netState = await NetInfo.fetch();
        useNetworkStore.setState({ isConnected: netState.isConnected ?? true });
      }

      // 3.1 Resolve Chat
      let chat = chatUUID
        ? useChatStore.getState().chats.find((c) => c.uuid === chatUUID)
        : null;

      if (!chat && chatUUID) {
        try {
          const chatRow: any = await database.chat.db.getFirstAsync(
            "SELECT * FROM chat WHERE uuid = ?",
            [chatUUID],
          );
          if (chatRow) {
            chat = {
              ...chatRow,
              members: await database.chat.member.get.by.chatUUID(chatUUID),
            };
          }
        } catch (e) {}
      }

      // 3.2 Resolve Sender
      let senderUUID = data.senderUUID || messageData?.senderUUID;
      let senderUser = senderUUID
        ? useUserStore.getState().users[senderUUID]
        : null;

      if (!senderUser && senderUUID) {
        try {
          senderUser = await database.user.get.byUUID(senderUUID);
        } catch (e) {}
      }

      const localUserUUID = useUserStore.getState().localUserUUID;

      // --- 4. Resolve Identity (precise alignment with useChatMetadata) ---
      let chatName = data.chatName || data.title || chat?.name || "Novyse";
      let chatImageUUID =
        data.chatIcon ||
        chat?.profilePictureUUID ||
        "00000000-0000-0000-0000-000000000000";

      if (chat && chat.type === "DM") {
        const otherMember = chat.members?.find(
          (m: any) => m.uuid !== localUserUUID,
        );
        const targetUUID = otherMember?.uuid || localUserUUID;
        let targetUser = useUserStore.getState().users[targetUUID || ""];
        if (!targetUser && targetUUID) {
          targetUser = await database.user.get.byUUID(targetUUID);
        }

        if (chat.members?.length === 1 || !otherMember) {
          chatName = "Saved Messages";
          chatImageUUID = targetUser?.profilePictureUUID || null;
        } else {
          chatName = targetUser?.name || "User";
          chatImageUUID = targetUser?.profilePictureUUID || null;
        }
      }

      let senderName = senderUser?.name;
      let senderImageUUID = senderUser?.profilePictureUUID;

      // --- 5. Resolve Avatars (Local Storage) ---
      let senderAvatarURI: string | undefined = undefined;
      let chatAvatarURI: string | undefined = undefined;

      const resolveLocalURI = async (uuid: string | null | undefined) => {
        if (!uuid || typeof uuid !== "string") return undefined;
        if (
          uuid.startsWith("http") ||
          uuid.startsWith("file://") ||
          uuid.startsWith("/")
        )
          return uuid;
        if (uuid.length < 20) return undefined;
        try {
          // 1. Try local storage
          const database = (await import("../../storage/database")).default;
          const storage = (await import("../../storage/file")).default;
          const ref = await database.file.get.ref(uuid);
          if (ref) {
            const local = await storage.read(ref);
            if (local) return local;
          }

          // 2. Fallback to Gateway (Remote)
          const gateway = (await import("../../backend-services/api-gateway"))
            .default;
          const res = (await gateway.file.retrieve(uuid)) as any;
          if (res?.success && res?.downloadURL) return res.downloadURL;
        } catch (e) {
          console.error(
            "[MobileNotificationManager] Avatar resolution failed for:",
            uuid,
            e,
          );
        }
        return undefined;
      };

      chatAvatarURI = (await resolveLocalURI(chatImageUUID)) as
        | string
        | undefined;
      senderAvatarURI = (await resolveLocalURI(senderImageUUID)) as
        | string
        | undefined;

      console.log(
        `[MobileNotificationManager] Decided Avatars: Chat=[${chatAvatarURI ? "YES" : "NO"}] Sender=[${senderAvatarURI ? "YES" : "NO"}]`,
      );

      // Telegram style: DM large icon is the other person's avatar
      if (!chatAvatarURI && chat?.type === "DM" && senderAvatarURI) {
        chatAvatarURI = senderAvatarURI;
      }

      // --- 7. Resolve Text Content & Timestamp ---
      const formatted = messageFormat.format(messageData || data);
      const safeContent =
        formatted?.content && String(formatted.content).trim().length > 0
          ? String(formatted.content)
          : data.content || data.body || messageData?.content || " ";

      // --- 7.5 Resolve Unread Counts & Badges ---
      const chats = useChatStore.getState().chats;

      // Use Luxon for localized timestamp (UTC -> Local)
      let messageTimestamp = Date.now();
      if (messageData?.at) {
        try {
          messageTimestamp = DateTime.fromISO(messageData.at, { zone: "utc" })
            .toLocal()
            .toMillis();
        } catch (e) {
          console.warn("[MobileNotificationManager] Luxon parse failed:", e);
        }
      }

      // --- 8. Resolve Conversational History ---
      const notificationId = chatUUID;
      const displayed = await notifee.getDisplayedNotifications();
      const existing = displayed.find((n) => n.id === notificationId);

      let messageHistory: any[] = [];
      if (
        existing &&
        existing.notification.android?.style?.type === AndroidStyle.MESSAGING
      ) {
        messageHistory =
          (existing.notification.android.style as any).messages || [];
      }

      const person: AndroidPerson = {
        name: senderName || "Unknown",
        id: senderUUID,
      };
      if (senderAvatarURI && senderAvatarURI.trim().length > 0) {
        person.icon = senderAvatarURI;
      }

      messageHistory.push({
        text: safeContent,
        timestamp: messageTimestamp,
        person,
      });

      // Limit history to 10 messages
      if (messageHistory.length > 10) {
        messageHistory = messageHistory.slice(-10);
      }

      const chatUnreadCount = messageHistory.length;

      try {
        await notifee.setBadgeCount(chatUnreadCount);
      } catch (e) {
        console.warn(
          "[MobileNotificationManager] Failed to set badge count",
          e,
        );
      }

      const messagingStyle: AndroidMessagingStyle = {
        type: AndroidStyle.MESSAGING,
        person: {
          name: "Me",
          id: localUserUUID || "me",
        },
        messages: messageHistory,
        title: chatName,
        group: chat?.type === "DM" ? false : true,
      };

      const androidConfig: NotificationAndroid = {
        channelId: "chat_messages_v4",
        groupId: chatUUID,
        smallIcon: "notification_icon",
        color: "#4f8cff",
        importance: AndroidImportance.HIGH,
        pressAction: { id: "default" },
        category: AndroidCategory.MESSAGE,
        badgeCount: chatUnreadCount,
        badgeIconType: AndroidBadgeIconType.LARGE,
        sound: "default",
        showTimestamp: true,
        timestamp: messageTimestamp,
        circularLargeIcon: true,
        largeIcon: chatAvatarURI,
        actions: [
          {
            title: "Reply",
            pressAction: { id: "reply" },
            input: { placeholder: "Type a message..." },
          },
          {
            title: "Mark as read",
            pressAction: { id: "mark_read" },
          },
        ],
        style: messagingStyle,
      };

      const notificationPayload: Notification = {
        id: notificationId,
        title: chatName,
        body: safeContent,
        data: {
          chatUUID: chatUUID || "",
          messageID: internalId || "",
        },
        android: androidConfig,
      };

      console.log(
        `[MobileNotificationManager] FINAL RESOLVED: [${chatName}] ${senderName}: ${safeContent} (History: ${messageHistory.length})`,
      );
      await notifee.displayNotification(notificationPayload);
      console.log(
        "[MobileNotificationManager] Display call completed successfully.",
      );
    } catch (error: any) {
      console.error("[MobileNotificationManager] CRITICAL FAILURE:", error);
    }
  }

  async displayCallNotification(callData: any) {
    await notifee.displayNotification({
      title: "Incoming Call",
      subtitle: "Novyse",
      id: "incoming_call_test",
      body: "Drag up to see options",

      android: {
        channelId: "chat_messages_v4",
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        smallIcon: "notification_icon",
        ongoing: true,
        asForegroundService: true,
        loopSound: true,
        vibrationPattern: [300, 500], // Loop: vibrate 500ms, pause 300ms
        fullScreenAction: {
          id: "default",
          launchActivity: "default",
        },
        pressAction: {
          id: "default",
          launchActivity: "default",
        },
        actions: [
          {
            title: "Answer",
            pressAction: { id: "answer_call", launchActivity: "default" },
          },
          {
            title: "Decline",
            pressAction: { id: "decline_call" },
          },
        ],
      },
      data: {
        type: "incoming_call",
        chatUUID: callData.chatUUID,
      },
    });
  }
  async displayVoiceChatNotification(
    chatName: string,
    isMicOn: boolean,
    isCamOn: boolean,
    chatUUID: string,
  ) {
    if (Platform.OS !== "android") return;

    try {
      await notifee.createChannel({
        id: "novyse_comms_service",
        name: "Novyse Comms",
        importance: AndroidImportance.LOW,
      });

      await notifee.displayNotification({
        title: i18n.t("chat.comms.notification.inCall", { chatName }),
        body: i18n.t("chat.comms.notification.tapToReturn"),
        id: "novyse_comms_persistent",
        android: {
          channelId: "novyse_comms_service",
          category: AndroidCategory.SERVICE,
          ongoing: true,
          asForegroundService: true,
          smallIcon: "notification_icon",
          pressAction: { id: "default" },
          actions: [
            {
              title: isMicOn
                ? i18n.t("chat.comms.notification.muteMic")
                : i18n.t("chat.comms.notification.unmuteMic"),
              pressAction: { id: "toggle_mic" },
            },
            {
              title: isCamOn
                ? i18n.t("chat.comms.notification.turnCamOff")
                : i18n.t("chat.comms.notification.turnCamOn"),
              pressAction: { id: "toggle_cam" },
            },
            {
              title: i18n.t("chat.comms.notification.disconnect"),
              pressAction: { id: "leave_voice" },
            },
          ],
        },
        data: {
          chatUUID,
        },
      });
    } catch (e) {
      console.error(
        "[MobileNotificationManager] Error displaying voice chat notification:",
        e,
      );
    }
  }

  async hideVoiceChatNotification() {
    if (Platform.OS !== "android") return;
    
    try {
      // Metodo "più pulito": interroghiamo direttamente il sistema operativo
      // per sapere se la notifica del servizio in background è attualmente attiva.
      const displayedNotifications = await notifee.getDisplayedNotifications();
      const isServiceRunning = displayedNotifications.some(
        (n) => n.id === "novyse_comms_persistent"
      );

      if (!isServiceRunning) {
        return; // Il servizio non è in esecuzione, evitiamo il comando di stop fatale.
      }
      
      await notifee.stopForegroundService();
      await notifee.cancelNotification("novyse_comms_persistent");
    } catch (e) {
      console.error(
        "[MobileNotificationManager] Error hiding voice chat notification:",
        e,
      );
    }
  }
}

if (Platform.OS === "android") {
  notifee.registerForegroundService((notification) => {
    return new Promise(() => {
      // The promise must not resolve until we explicitly stop the service
    });
  });
}
const mobileNotificationManager = new MobileNotificationManager();
export default mobileNotificationManager;
