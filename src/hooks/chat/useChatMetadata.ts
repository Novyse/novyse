import { useMemo } from "react";
import useChatStore from "@/context/ChatContext";
import useUserStore from "@/context/UserContext";

export const useChatMetadata = (
  chatUUIDorHandle: string | undefined,
  sub = 0,
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
          type: chat.type,
          memberCount: 1,
          onlineMembersCount: 1,
          memberActivityData: [],
        };
      }

      return {
        name: targetUser?.name || "User",
        profilePictureUUID: targetUser?.profilePictureUUID || null,
        type: chat.type,
        memberCount: 2,
        onlineMembersCount: targetUser?.status === "ONLINE" ? 2 : 1,
        lastAccessAt: targetUser?.lastAccessAt || null,
        memberActivityData: otherMember?.action
          ? [
              {
                action: otherMember.action,
                userUUID: targetUUID,
              },
            ]
          : [],
      };
    }

    // Default for Groups/Channels

    return {
      name: chat.name || "Group",
      profilePictureUUID: chat.profilePictureUUID || null,
      type: chat.type,
      memberCount: chat.members?.length || 0,
      onlineMembersCount:
        chat.members?.filter((m) => users[m.uuid]?.status === "ONLINE")
          .length || 0,
      memberActivityData:
        chat.members
          ?.filter((member) => member.action)
          .map((member) => {
            return {
              action: member.action,
              userUUID: member.uuid,
            };
          }) || [],
    };
  }, [chat, localUserUUID, users]);
};
