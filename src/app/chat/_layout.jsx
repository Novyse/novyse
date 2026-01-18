import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  View,
  useWindowDimensions,
  StyleSheet,
  Animated,
  Text,
} from "react-native";
import { Slot, useRouter, useLocalSearchParams } from "expo-router";
import MyStatusBar from "@/src/components/MyStatusBar";
import ScreenLayout from "@/src/components/ScreenLayout";
import Sidebar from "@/src/components/Sidebar";
import ChatList from "@/src/app/ChatList";
import CreateChatModal from "@/src/components/modals/createChat";
import BigFloatingCommsMenu from "@/src/components/comms/BigFloatingCommsMenu";
import SmallCommsMenu from "@/src/components/comms/SmallCommsMenu";
import auth from "@/src/utils/welcome/auth";
import methods from "@/src/utils/webrtc/methods";
import chatUtils from "@/src/utils/chat";
import queueManager from "@/src/utils/chat/queueManager";
import { ThemeContext } from "@/context/ThemeContext";
import { ChatContext } from "@/context/ChatContext";
import { LocalUserContext } from "@/context/LocalUserContext";
import { NetworkContext } from "@/context/NetworkContext";
import useAppInit from "@/src/hooks/auth/useAppInit";

const { get, check } = methods;

export default function ChatLayout() {
  useAppInit(true);
  const { width } = useWindowDimensions();
  const isSmallScreen = width <= 768;
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useContext(ThemeContext);
  const { isConnected } = useContext(NetworkContext);
  const {
    setSelectedChatUUID,
    setSelectedHandle,
    setSelectedChatName,
    setSelectedChatPictureUUID,
    selectedChatUUID,
  } = useContext(ChatContext);

  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isCreateChatModalVisible, setIsCreateChatModalVisible] =
    useState(false);
  const [sidebarPosition] = useState(new Animated.Value(-250));

  useEffect(() => {
    const handleParams = async () => {
      if (params.chatUUIDorHandle) {
        const { chatUUID, chatHandle, chatName, chatPictureUUID } =
          await chatUtils.getChatData(params.chatUUIDorHandle);
        setSelectedChatUUID(chatUUID);
        setSelectedHandle(chatHandle);
        setSelectedChatName(chatName);
        setSelectedChatPictureUUID(chatPictureUUID);
      }
    };
    handleParams();
  }, [params.chatUUIDorHandle]);

  useEffect(() => {
    queueManager.initialize(() => isConnected);
  }, [isConnected]);

  const toggleSidebar = useCallback(
    () => setIsSidebarVisible((prev) => !prev),
    [],
  );

  const renderCommsMenu = () => {
    return;
    const isInComms = check.isInComms();
    if (!isInComms) return null;
    const commsUUID = get.commUUID();
    const chatUUID = commsUUID?.split("_")[0];
    if (selectedChatUUID !== chatUUID) {
      return isSmallScreen ? <SmallCommsMenu /> : <BigFloatingCommsMenu />;
    }
    return null;
  };

  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      {!isSmallScreen && (
        <Sidebar
          isSidebarVisible={isSidebarVisible}
          toggleSidebar={toggleSidebar}
          setIsCreateChatModalVisible={setIsCreateChatModalVisible}
          handleSettingsPress={() => router.navigate("/settings")}
          logout={() => auth.logout(router, false)}
          sidebarPosition={sidebarPosition}
          theme={theme}
        />
      )}
      <View style={styles.mainContainer}>
        {isSmallScreen ? (
          <View style={styles.fullScreen}>
            <Slot />
            {renderCommsMenu()}
          </View>
        ) : (
          <View style={styles.splitView}>
            <View style={styles.master}>
              <View style={styles.chatListWrapper}>
                {renderCommsMenu()}
                <ChatList
                  onChatSelect={(id) => router.push(`/chat/${id}`)}
                  toggleSidebar={toggleSidebar}
                />
              </View>
            </View>
            <View style={styles.detail}>
              {params.chatUUIDorHandle ? (
                <Slot />
              ) : (
                <View style={styles.centered}>
                  <Text style={{ color: theme.text, fontSize: 18 }}>
                    No chat selected
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
      {!isSmallScreen && (
        <CreateChatModal
          visible={isCreateChatModalVisible}
          onClose={() => setIsCreateChatModalVisible(false)}
        />
      )}
    </ScreenLayout>
  );
}

function createStyle(theme) {
  return StyleSheet.create({
    mainContainer: { flex: 1 },
    fullScreen: { flex: 1 },
    splitView: { flex: 1, flexDirection: "row" },
    master: {
      width: 330,
    },
    detail: { flex: 1, backgroundColor: theme.backgroundChatContentGradient },
    chatListWrapper: { flex: 1, position: "relative" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  });
}
