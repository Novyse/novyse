// In app/chat/[chatUUIDorHandle].jsx
import React, { useEffect, useContext } from "react";
import ChatContainer from "@/src/app/ChatContainer";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChatContext } from "@/context/ChatContext";
import chatUtils from "@/src/utils/chat";

export default function ChatPage() {
  const { chatUUIDorHandle } = useLocalSearchParams();
  const { setSelectedChatUUID, setSelectedHandle, setSelectedChatName } =
    useContext(ChatContext);

  const router = useRouter();
  

  useEffect(() => {
    let isMounted = true;

    // 1. Reset immediato dei dati vecchi per evitare il ghosting
    setSelectedChatUUID(null);
    setSelectedChatName("Caricamento...");

    async function init() {
      const data = await chatUtils.getChatData(chatUUIDorHandle);
      if (isMounted && data) {
        setSelectedChatUUID(data.chatUUID);
        setSelectedChatName(data.chatName);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [chatUUIDorHandle]);

  return <ChatContainer onBack={() => router.canGoBack() ? router.back() : router.navigate("/chat")}/>;
}
