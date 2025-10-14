import { useCallback, useMemo } from "react";
import moment from "moment";

const usePreparedMessages = (messages) => {
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
      const dateOfGroup = moment(msg.created_at).format("YYYY-MM-DD");
      const start = i;

      // Avanza fino alla fine del gruppo
      while (
        i < sortedAsc.length &&
        !isBreaking(sortedAsc[i]) &&
        sortedAsc[i].sender_name === sender &&
        moment(sortedAsc[i].created_at).format("YYYY-MM-DD") === dateOfGroup
      ) {
        i++;
      }

      const end = i - 1;

      if (sortedAsc[start]) sortedAsc[start].showSenderName = true;
      if (sortedAsc[end]) sortedAsc[end].showAvatar = true;
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
      const msgDate = moment(msg.created_at).format("YYYY-MM-DD");
      const msgDisplay = moment(msg.created_at).format("MMMM D, YYYY");

      if (msgDate !== currentDate && buffer.length > 0) {
        prepared.push(...buffer);
        prepared.push({
          type: "separator",
          data: displayDate,
          uniqueKey: `separator-${currentDate}`,
        });
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
      prepared.push({
        type: "separator",
        data: displayDate,
        uniqueKey: `separator-${currentDate}`,
      });
    }

    return prepared;
  }, []);

  return useMemo(() => prepareMessages(messages), [messages, prepareMessages]);
};

export default usePreparedMessages;
