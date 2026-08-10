import { useCallback, useMemo, useRef } from "react";
import { DateTime } from "luxon";
import useUserStore from "@/src/context/UserStore";
import { useTranslation } from "react-i18next";

const usePreparedMessages = (messages, chatType) => {
  const { t } = useTranslation();
  const userUUID = useUserStore((state) => state.localUserUUID);
  const initializedUnreadRef = useRef(false);
  const oldestUnreadIdRef = useRef(null);

  const prepareMessages = useCallback(
    (msgs = []) => {
      if (!Array.isArray(msgs) || msgs.length === 0) return [];

      // We treat messages without a created_at (pending ones) as being created "now" for sorting purposes
      const getSortTime = (msg) =>
        msg.created_at
          ? DateTime.fromISO(msg.created_at, { zone: "utc" }).toMillis()
          : Date.now();

      const sortedAsc = [...msgs].sort(
        (a, b) => getSortTime(a) - getSortTime(b),
      );

      const isBreaking = (msg) =>
        !msg || msg.type === "system" || msg.type === "date";

      const showSenderNameIds = new Set();
      const showAvatarIds = new Set();

      // Calcolo flag showSenderName / showAvatar
      for (let i = 0; i < sortedAsc.length; ) {
        const msg = sortedAsc[i];
        if (isBreaking(msg)) {
          i++;
          continue;
        }

        const sender = msg.sender_name;
        const senderUUID = msg.senderUUID;
        const dateTime = msg.created_at
          ? DateTime.fromISO(msg.created_at, { zone: "utc" }).toLocal()
          : DateTime.now();
        const dateOfGroup = dateTime.isValid
          ? dateTime.toFormat("yyyy-MM-dd")
          : null;
        const start = i;

        while (
          i < sortedAsc.length &&
          !isBreaking(sortedAsc[i]) &&
          sortedAsc[i].sender_name === sender &&
          (() => {
            const dt = sortedAsc[i].created_at
              ? DateTime.fromISO(sortedAsc[i].created_at, {
                  zone: "utc",
                }).toLocal()
              : DateTime.now();
            return dt.isValid ? dt.toFormat("yyyy-MM-dd") : null;
          })() === dateOfGroup
        ) {
          i++;
        }

        const end = i - 1;

        // Imposta showSenderName e showAvatar solo se il senderUUID non è quello dell'utente corrente
        const isDM = chatType === "DM" || chatType === "USER";
        if (!isDM) {
          if (sortedAsc[start] && senderUUID !== userUUID) {
            showSenderNameIds.add(sortedAsc[start].id);
          }
          if (sortedAsc[end] && senderUUID !== userUUID) {
            showAvatarIds.add(sortedAsc[end].id);
          }
        }
      }

      // Ordina per visualizzazione (nuovi → vecchi)
      const sortedDesc = [...sortedAsc].sort(
        (a, b) => getSortTime(b) - getSortTime(a),
      );

      // Pre-evaluate the absolute oldest unread payload mapping locally 
      // without overloading the buffer iterations.
      if (!initializedUnreadRef.current && sortedDesc.length > 0) {
        let tempTracker = {};
        for (const msg of sortedDesc) {
          if (msg.readBy && msg.readBy.length > 0) {
            msg.readBy.forEach((read) => {
              if (!tempTracker[read.userUUID]) {
                tempTracker[read.userUUID] = read.readAt;
              }
            });
          }
          let tempPropagated = [...(msg.readBy || [])];
          Object.keys(tempTracker).forEach((uuid) => {
            if (!tempPropagated.find((r) => r.userUUID === uuid)) {
              tempPropagated.push({ userUUID: uuid, readAt: tempTracker[uuid] });
            }
          });

          const isReadByMe = tempPropagated.some((r) => r.userUUID === userUUID);
          if (!isReadByMe && msg.senderUUID !== userUUID && !msg.internal) {
            oldestUnreadIdRef.current = msg.id;
          }
        }
        initializedUnreadRef.current = true;
      }

      const prepared = [];
      let currentDate = null;
      let displayDate = null;
      let buffer = [];
      let userReadsTracker = {};

      for (const msg of sortedDesc) {
        // Propagate reads to older messages
        if (msg.readBy && msg.readBy.length > 0) {
          msg.readBy.forEach((read) => {
            if (!userReadsTracker[read.userUUID]) {
              userReadsTracker[read.userUUID] = read.readAt;
            }
          });
        }

        let propagatedReadBy = [...(msg.readBy || [])];
        Object.keys(userReadsTracker).forEach((uuid) => {
          if (!propagatedReadBy.find((r) => r.userUUID === uuid)) {
            propagatedReadBy.push({
              userUUID: uuid,
              readAt: userReadsTracker[uuid],
            });
          }
        });
        msg.readBy = propagatedReadBy;
        // For pending messages, use current date
        const dateTime = msg.created_at
          ? DateTime.fromISO(msg.created_at, { zone: "utc" }).toLocal()
          : DateTime.now();
        const msgDate = dateTime.isValid
          ? dateTime.toFormat("yyyy-MM-dd")
          : null;
        const msgDisplay = dateTime.isValid
          ? dateTime.toFormat("MMMM d, yyyy")
          : null;

        if (msgDate !== currentDate && buffer.length > 0) {
          prepared.push(...buffer);
          if (displayDate !== null) {
            prepared.push({
              type: "separator",
              data: displayDate,
              uniqueKey: `separator-${currentDate}`,
            });
          }
          buffer = [];
        }

        currentDate = msgDate;
        displayDate = msgDisplay;

        if (isBreaking(msg)) {
          buffer.push({ type: msg.type, data: msg, uniqueKey: msg.id });
        } else {
          buffer.push({
            type: "text",
            data: {
              ...msg,
              readBy: propagatedReadBy,
              showSenderName: showSenderNameIds.has(msg.id),
              showAvatar: showAvatarIds.has(msg.id),
            },
            uniqueKey: msg.id,
          });

          if (oldestUnreadIdRef.current === msg.id) {
            buffer.push({
              type: "separator-with-lines",
              data: t("chat.unreadMessages"),
              uniqueKey: "unread-separator",
            });
          }
        }
      }

      if (buffer.length > 0) {
        prepared.push(...buffer);
        if (displayDate !== null) {
          prepared.push({
            type: "separator",
            data: displayDate,
            uniqueKey: `separator-${currentDate}`,
          });
        }
      }

      return prepared.reverse();
    },
    [userUUID, chatType],
  );

  return useMemo(() => prepareMessages(messages), [messages, prepareMessages]);
};

export default usePreparedMessages;
