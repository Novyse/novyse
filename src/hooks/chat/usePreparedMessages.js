import { useCallback, useMemo, useContext } from "react";
import { DateTime } from "luxon";
import { LocalUserContext } from "@/context/LocalUserContext";

const usePreparedMessages = (messages) => {
  const { userUUID } = useContext(LocalUserContext);

  const prepareMessages = useCallback((msgs = []) => {
    if (!Array.isArray(msgs) || msgs.length === 0) return [];

    // We treat messages without a created_at (pending ones) as being created "now" for sorting purposes
    const getSortTime = (msg) =>
      msg.created_at ? new Date(msg.created_at).getTime() : Date.now();

    const sortedAsc = [...msgs].sort((a, b) => getSortTime(a) - getSortTime(b));

    const isBreaking = (msg) =>
      !msg || msg.type === "system" || msg.type === "date";

    // Calcolo flag showSenderName / showAvatar
    for (let i = 0; i < sortedAsc.length; ) {
      const msg = sortedAsc[i];
      if (isBreaking(msg)) {
        i++;
        continue;
      }

      const sender = msg.sender_name;
      const senderUUID = msg.senderUUID;
      const msgTime = msg.created_at ? new Date(msg.created_at) : new Date();
      const dateTime = DateTime.fromJSDate(msgTime);
      const dateOfGroup = dateTime.isValid
        ? dateTime.toFormat("yyyy-MM-dd")
        : null;
      const start = i;

      while (
        i < sortedAsc.length &&
        !isBreaking(sortedAsc[i]) &&
        sortedAsc[i].sender_name === sender &&
        (() => {
          const t = sortedAsc[i].created_at
            ? new Date(sortedAsc[i].created_at)
            : new Date();
          const dt = DateTime.fromJSDate(t);
          return dt.isValid ? dt.toFormat("yyyy-MM-dd") : null;
        })() === dateOfGroup
      ) {
        i++;
      }

      const end = i - 1;

      // Imposta showSenderName e showAvatar solo se il senderUUID non è quello dell'utente corrente
      if (sortedAsc[start] && senderUUID !== userUUID) {
        sortedAsc[start].showSenderName = true;
      }
      if (sortedAsc[end] && senderUUID !== userUUID) {
        sortedAsc[end].showAvatar = true;
      }
    }

    // Ordina per visualizzazione (nuovi → vecchi)
    const sortedDesc = [...sortedAsc].sort(
      (a, b) => getSortTime(b) - getSortTime(a),
    );

    const prepared = [];
    let currentDate = null;
    let displayDate = null;
    let buffer = [];

    for (const msg of sortedDesc) {
      // For pending messages, use current date
      const timestamp = msg.created_at ? new Date(msg.created_at) : new Date();
      const dateTime = DateTime.fromJSDate(timestamp);
      const msgDate = dateTime.isValid ? dateTime.toFormat("yyyy-MM-dd") : null;
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
            showSenderName: msg.showSenderName || false,
            showAvatar: msg.showAvatar || false,
          },
          uniqueKey: msg.id,
        });
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
  }, []);

  return useMemo(() => prepareMessages(messages), [messages, prepareMessages]);
};

export default usePreparedMessages;
