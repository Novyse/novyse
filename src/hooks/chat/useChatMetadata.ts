import { useMemo } from "react";
import useChatStore from "@/context/ChatContext";
import useUserStore from "@/context/UserContext";
import { Chat } from "@/src/types";

export const useChatMetadata = (
  chatUUIDorHandle: string | Chat | undefined,
) => {
  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const users = useUserStore((state) => state.users);

  // If we got a string, find the chat in the store
  const chat = useChatStore((state) => {
    if (typeof chatUUIDorHandle !== "string") return chatUUIDorHandle;
    return state.chats.find(
      (c: any) => c.uuid === chatUUIDorHandle || c.handle === chatUUIDorHandle,
    );
  });

  return useMemo(() => {
    if (!chat) return { name: "Loading...", profilePictureUUID: null };

    if (chat.type === "DM") {
      const otherMember = chat.members?.find((m) => m.uuid !== localUserUUID);
      const targetUUID = otherMember?.uuid || localUserUUID;
      const targetUser = users[targetUUID || ""];

      if (chat.members?.length === 1 || !otherMember) {
        return {
          name: "Saved Messages",
          profilePictureUUID: targetUser?.profilePictureUUID || null,
        };
      }

      return {
        name: targetUser?.name || "User",
        profilePictureUUID: targetUser?.profilePictureUUID || null,
      };  
    }

    // Default for Groups/Channels
    return {
      name: chat.name || "Group",
      profilePictureUUID: chat.profilePictureUUID || null,
    };
  }, [chat, localUserUUID, users]);
};
