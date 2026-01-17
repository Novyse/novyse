import React, { useState, useContext, useCallback } from "react";
import { Animated } from "react-native";
import ChatList from "@/src/app/ChatList";
import Sidebar from "@/src/components/Sidebar";
import CreateGroupModal from "@/src/components/modals/createChat";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import auth from "@/src/utils/welcome/auth";

export default function ChatIndex() {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isCreateChatModalVisible, setIsCreateChatModalVisible] =
    useState(false);
  const [sidebarPosition] = useState(new Animated.Value(-250));

  const toggleSidebar = useCallback(
    () => setIsSidebarVisible((prev) => !prev),
    []
  );

  return (
    <>
      <Sidebar
        isSidebarVisible={isSidebarVisible}
        toggleSidebar={toggleSidebar}
        setIsCreateChatModalVisible={setIsCreateChatModalVisible}
        handleSettingsPress={() => router.navigate("/settings")}
        logout={() => auth.logout(router, false)}
        sidebarPosition={sidebarPosition}
        theme={theme}
      />
      <ChatList
        onChatSelect={(id) => router.push(`/chat/${id}`)}
        toggleSidebar={toggleSidebar}
      />
      <CreateGroupModal
        visible={isCreateChatModalVisible}
        onClose={() => setIsCreateChatModalVisible(false)}
      />
    </>
  );
}
