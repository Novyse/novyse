import { useCallback, useMemo } from "react";
import moment from "moment";

const usePreparedMessages = (messages) => {
  const prepareMessages = useCallback((msgs = []) => {
    if (!Array.isArray(msgs) || msgs.length === 0) return [];

    const sortedMessages = [...msgs].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const prepared = [];
    let lastDate = null;
    let lastDateDisplay = null;
    let groupMessages = [];

    sortedMessages.forEach((message) => {
      const messageDate = moment(message.created_at).format("YYYY-MM-DD");
      const displayDate = moment(message.created_at).format("MMMM D, YYYY");

      if (messageDate !== lastDate) {
        if (groupMessages.length > 0) {
          prepared.push(...groupMessages);
          prepared.push({
            type: "separator",
            data: lastDateDisplay,
            uniqueKey: `separator-${lastDate}`,
          });
        }
        groupMessages = [];
        lastDate = messageDate;
        lastDateDisplay = displayDate;
      }

      if (message.type === "system") {
        groupMessages.push({
          type: "system",
          data: message,
          uniqueKey: message.id,
        });
      } else {
        groupMessages.push({
          type: "text",
          data: message,
          uniqueKey: message.id,
        });
      }
    });

    if (groupMessages.length > 0) {
      prepared.push(...groupMessages);
      prepared.push({
        type: "separator",
        data: lastDateDisplay,
        uniqueKey: `separator-${lastDate}`,
      });
    }

    return prepared;
  }, []);

  const preparedMessages = useMemo(
    () => prepareMessages(messages),
    [messages, prepareMessages]
  );

  return preparedMessages;
};

export default usePreparedMessages;
