import { useState, useEffect } from "react";
import { useCommsContext } from "@/src/context/CommsContext";
import gateway from "@/src/utils/backend-services/api-gateway";
import useChatStore from "@/src/context/ChatContext";

const useCommsData = (chatUUID, sub) => {
  const {
    checkRoomMatch,
    room: contextRoom,
    participants: contextParticipants,
  } = useCommsContext();

  const cachedData = useChatStore((state) => state.commsCache[chatUUID]?.[sub]);
  const setCommsCache = useChatStore((state) => state.setCommsCache);

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const isMatching = checkRoomMatch(chatUUID, sub);

    if (isMatching) {
      setRoom(contextRoom);
      setParticipants(contextParticipants);
    } else if (cachedData) {
      setRoom(cachedData.room);
      setParticipants(cachedData.participants);
    }
  }, [
    chatUUID,
    sub,
    checkRoomMatch,
    contextRoom,
    contextParticipants,
    cachedData,
  ]);

  useEffect(() => {
    const isMatching = checkRoomMatch(chatUUID, sub);
    if (isMatching) return; // No polling if actively in the room

    const fetchRoom = async () => {
      try {
        const {
          success,
          room: fetchedRoom,
          participants: fetchedParticipants,
        } = await gateway.comms.room.get(chatUUID, sub);

        if (success) {
          setCommsCache(chatUUID, sub, {
            room: fetchedRoom,
            participants: fetchedParticipants,
          });
        }
      } catch (error) {
        console.error("Error polling comms room:", error);
      }
    };

    fetchRoom();
    const intervalId = setInterval(fetchRoom, 5000);

    return () => clearInterval(intervalId);
  }, [chatUUID, sub, checkRoomMatch, setCommsCache]);

  const getCreationTime = () => {
    return room ? room.roomInfo.creationTimeMs : null;
  };

  return {
    room,
    participants,
    getCreationTime,
  };
};

export default useCommsData;
