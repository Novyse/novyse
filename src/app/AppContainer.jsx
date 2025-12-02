import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  BackHandler,
  Dimensions,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenLayout from "../components/ScreenLayout";
import eventEmitter from "../utils/global/Events/EventEmitter";
import auth from "../utils/welcome/auth";
import ChatList from "./ChatList";
import ChatContainer from "./ChatContainer";
import Sidebar from "../components/Sidebar";
import CreateGroupModal from "../components/modals/ModalCreateGroupChannelForum";
import BigFloatingCommsMenu from "../components/comms/BigFloatingCommsMenu";
import SmallCommsMenu from "../components/comms/SmallCommsMenu";
import methods from "../utils/webrtc/methods";
const { get, check } = methods;
import SmartBackground from "../components/SmartBackground";
import chatUtils from "../utils/chat";
import queueManager from "../utils/chat/queueManager";

// Hooks
import useAppInit from "../hooks/auth/useAppInit";

// Context
import { ThemeContext } from "@/context/ThemeContext";
import { ChatContext } from "@/context/ChatContext";
import { UserContext } from "@/context/UserContext";
import { NetworkContext } from "@/context/NetworkContext";

const AppContainer = () => {
  useAppInit(true);
  const {
    selectedChatUUID,
    setSelectedChatUUID,
    selectedHandle,
    setSelectedHandle,
    selectedChatName,
    setSelectedChatName,
    selectedChatPictureUUID,
    setSelectedChatPictureUUID,
  } = useContext(ChatContext);

  const { setUserUUID } = useContext(UserContext);

  const { isConnected } = useContext(NetworkContext);

  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isToggleSearchChats, setIsToggleSearchChats] = useState(false);
  const [isCreateGroupModalVisible, setIsCreateGroupModalVisible] =
    useState(false);

  const [forceUpdate, setForceUpdate] = useState(0);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const [sidebarPosition] = useState(new Animated.Value(-250));
  const [chatContentPosition] = useState(
    new Animated.Value(Dimensions.get("window").width)
  );

  // Set userUUID in UserContext on mount
  useEffect(() => {
    const fetchUserUUID = async () => {
      const userUUID = await auth.getUserUUID();
      if (userUUID) {
        setUserUUID(userUUID);
      }
    };
    fetchUserUUID();
  }, [setUserUUID]);

  useEffect(() => {
    const updateData = async () => {
      const success = await auth.update();
    };
    updateData();
  }, []);

  const onChatSelect = useCallback(
    (chatUUID) => {
      if (selectedChatUUID === chatUUID) return; // No-op if selecting already selected chat
      router.setParams({ chatUUIDorHandle: chatUUID });
      router.navigate(`/chat/${chatUUID}`, { replace: true });
    },
    [router, selectedChatUUID]
  );

  // useEffect per screen size e params
  useEffect(() => {
    const updateScreenSize = () => {
      const { width } = Dimensions.get("window");
      setIsSmallScreen(width <= 768);
    };
    Dimensions.addEventListener("change", updateScreenSize);
    updateScreenSize();

    const handleParams = async () => {
      if (params.chatUUIDorHandle) {
        if (
          params.chatUUIDorHandle == selectedChatUUID ||
          params.chatUUIDorHandle == selectedHandle
        )
          return; // no-op if already selected

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
    const initializeQueueManager = async () =>
      await queueManager.initialize(() => isConnected);
    initializeQueueManager();
  }, [isConnected]);

  // useEffect per back button
  useEffect(() => {
    const backAction = () => {
      if (isSmallScreen && selectedChatUUID) {
        setSelectedChatUUID(null);
        return true;
      }
      BackHandler.exitApp();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => {
      backHandler.remove();
    };
  }, [isSmallScreen, selectedChatUUID]);

  useEffect(() => {
    if (isSmallScreen) {
      Animated.timing(chatContentPosition, {
        toValue:
          selectedChatUUID || selectedHandle
            ? 0
            : Dimensions.get("window").width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedChatUUID, selectedHandle, isSmallScreen, chatContentPosition]);

  // Ensure overlay is positioned correctly on mount (avoid flash)
  useEffect(() => {
    if (isSmallScreen) {
      // set initial value without animation
      chatContentPosition.setValue(
        selectedChatUUID || selectedHandle ? 0 : Dimensions.get("window").width
      );
    } else {
      // on large screens ensure overlay is off-screen
      chatContentPosition.setValue(Dimensions.get("window").width);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await auth.logout(router, false);
  };

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => !prev);
  }, []);

  // COMMS ROBA NON TOCCARE
  // useEffect per comms events
  useEffect(() => {
    const handleCommsStateChange = (data) => {
      if (data.from === get.deviceUUID()) {
        setForceUpdate((prev) => prev + 1);
      }
    };
    eventEmitter.getEmitter().on("comms_join", handleCommsStateChange);
    eventEmitter.getEmitter().on("comms_leave", handleCommsStateChange);
    return () => {
      eventEmitter.getEmitter().off("comms_join", handleCommsStateChange);
      eventEmitter.getEmitter().off("comms_leave", handleCommsStateChange);
    };
  }, []);

  // Funzioni per menu comms (memoizzate)
  const shouldShowBigFloatingCommsMenu = useCallback(() => {
    if (isSmallScreen) return false;
    const isInComms = check.isInComms();
    if (isInComms) {
      const commsUUID = get.commUUID();
      const chatUUID = commsUUID ? commsUUID.split("_")[0] : null;
      if (selectedChatUUID !== chatUUID) return true;
      return selectedChatUUID === chatUUID && "chat" === "chat";
    }
    return false;
  }, [isSmallScreen, selectedChatUUID, forceUpdate]);

  const renderBigFloatingCommsMenu = () =>
    shouldShowBigFloatingCommsMenu() ? <BigFloatingCommsMenu /> : null;

  const shouldShowSmallCommsMenu = useCallback(() => {
    if (!isSmallScreen) return false;
    const isInComms = check.isInComms();
    if (isInComms) {
      const commsUUID = get.commUUID();
      const chatUUID = commsUUID ? commsUUID.split("_")[0] : null;
      if (selectedChatUUID !== chatUUID) return true;
      return selectedChatUUID === chatUUID && "chat" === "chat";
    }
    return false;
  }, [isSmallScreen, selectedChatUUID, forceUpdate]);

  const renderSmallCommsMenu = () =>
    shouldShowSmallCommsMenu() ? <SmallCommsMenu /> : null;

  // COMMS ROBA NON TOCCARE

  const toggleSearch = useCallback(() => {
    setIsToggleSearchChats((prev) => !prev);
  }, []);

  const handleBackPress = useCallback(() => {
    setSelectedChatUUID(null);
    setSelectedHandle(null);
    setSelectedChatName(null);
    setSelectedChatPictureUUID(null);
    router.back();
  }, [
    router,
    setSelectedChatUUID,
    setSelectedHandle,
    setSelectedChatName,
    setSelectedChatPictureUUID,
  ]);

  // Render ChatContainer solo se selezionata
  const renderChatView = useCallback(() => {
    if (!params.chatUUIDorHandle) {
      return null;
    }
    return (
      <ChatContainer
        onBack={handleBackPress}
        theme={theme}
        isSmallScreen={isSmallScreen}
      />
    );
  }, [handleBackPress, theme, isSmallScreen]);

  return (
    <ScreenLayout>
      <StatusBar
        style="light"
        backgroundColor={"transparent"}
        translucent={true}
        hidden={false}
      />
      <Sidebar
        isSidebarVisible={isSidebarVisible}
        toggleSidebar={toggleSidebar}
        setIsCreateGroupModalVisible={setIsCreateGroupModalVisible}
        handleSettingsPress={() => router.navigate("/settings")}
        logout={logout}
        sidebarPosition={sidebarPosition}
        theme={theme}
      />

      {isSmallScreen ? (
        <>
          <View style={styles.container}>
            <View style={styles.chatList}>
              <ChatList
                onChatSelect={onChatSelect}
                isToggleSearchChats={isToggleSearchChats}
                setIsToggleSearchChats={setIsToggleSearchChats}
                isSmallScreen={isSmallScreen}
                theme={theme}
                colorScheme={colorScheme}
                toggleSidebar={toggleSidebar}
              />
            </View>
            <Animated.View
              pointerEvents={selectedChatUUID ? "auto" : "none"}
              style={[
                styles.chatContentOverlay,
                {
                  transform: [{ translateX: chatContentPosition }],
                },
              ]}
            >
              <SmartBackground
                colors={theme?.backgroundChatContentGradient}
                style={styles.chatContent}
                isSmallScreen={isSmallScreen}
              >
                {renderChatView()}
              </SmartBackground>
            </Animated.View>
          </View>
        </>
      ) : (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View
            style={[
              styles.chatList,
              styles.largeScreenChatList,
              { flexDirection: "column" },
            ]}
          >
            <View style={styles.chatListWrapper}>
              {renderBigFloatingCommsMenu()}
              <ChatList
                onChatSelect={onChatSelect}
                isToggleSearchChats={isToggleSearchChats}
                setIsToggleSearchChats={setIsToggleSearchChats}
                isSmallScreen={isSmallScreen}
                theme={theme}
                colorScheme={colorScheme}
                toggleSidebar={toggleSidebar}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>{renderChatView()}</View>
        </View>
      )}

      <CreateGroupModal
        visible={isCreateGroupModalVisible}
        onClose={() => setIsCreateGroupModalVisible(false)}
      />
      {!isConnected && (
        <Text style={styles.connectionInfoContainer}>
          Network Status: Not Connected
        </Text>
      )}
    </ScreenLayout>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      overflow: "hidden",
    },
    chatList: {
      flex: 1,
      minWidth: 330,
    },
    largeScreenChatList: {
      flex: 0,
      width: 330,
      borderRightWidth: 0,
      borderRightColor: theme.backgroundDivider,
    },
    chatContent: {
      padding: 0,
      flex: 1,
    },
    chatContentOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    chatListWrapper: {
      flex: 1,
      position: "relative",
    },
  });
}

export default AppContainer;
