import { useCallback, useMemo, useContext } from "react";
import { DateTime } from "luxon";
import { LocalUserContext } from "@/context/LocalUserContext";

const usePreparedMessages = (messages) => {
  const { userUUID } = useContext(LocalUserContext);

  const prepareMessages = useCallback((msgs = []) => {
    if (!Array.isArray(msgs) || msgs.length === 0) return [];

    const sortedAsc = [...msgs].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

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
      const dateTime = DateTime.fromJSDate(new Date(msg.created_at));
      const dateOfGroup = dateTime.isValid
        ? dateTime.toFormat("yyyy-MM-dd")
        : null;
      const start = i;

      // Avanza fino alla fine del gruppo
      while (
        i < sortedAsc.length &&
        !isBreaking(sortedAsc[i]) &&
        sortedAsc[i].sender_name === sender &&
        (DateTime.fromJSDate(new Date(sortedAsc[i].created_at)).isValid
          ? DateTime.fromJSDate(new Date(sortedAsc[i].created_at)).toFormat(
              "yyyy-MM-dd"
            )
          : null) === dateOfGroup
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
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const prepared = [];
    let currentDate = null;
    let displayDate = null;
    let buffer = [];

    for (const msg of sortedDesc) {
      const dateTime = DateTime.fromJSDate(new Date(msg.created_at));
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

    return prepared;
  }, []);

  return useMemo(() => prepareMessages(messages), [messages, prepareMessages]);
};

export default usePreparedMessages;
