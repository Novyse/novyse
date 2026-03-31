import { useState, useEffect } from "react";
import { useCommsContext } from "@/context/CommsContext";
import gateway from "@/src/utils/backend-services/api-gateway";

const useCommsData = (chatUUID, sub) => {
  const {
    checkRoomMatch,
    room: contextRoom,
    participants: contextParticipants,
  } = useCommsContext();

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const fetchRoom = async () => {
      if (checkRoomMatch(chatUUID, sub)) {
        setRoom(contextRoom);
        setParticipants(contextParticipants);
      } else {
        const { success, room: fetchedRoom } = await gateway.comms.room.get(
          chatUUID,
          sub,
        );
        if (success) {
          setRoom(fetchedRoom);
          setParticipants(fetchedRoom.remoteParticipants || []);
        }
      }
    };

    fetchRoom();
  }, [chatUUID, sub, checkRoomMatch, contextRoom, contextParticipants]);

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
