import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  BackHandler,
  Alert,
  Dimensions,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "@/context/ThemeContext";
import NetInfo from "@react-native-community/netinfo";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenLayout from "./components/ScreenLayout";
import eventEmitter from "./utils/EventEmitter";
import SocketMethods from "./utils/backend-services/socket-io";
import gateway from "./utils/backend-services/api-gateway";
import auth from "./utils/welcome/auth";
import ChatList from "./ChatList";
import ChatContainer from "./ChatContainer";
import Sidebar from "./components/Sidebar";
import CreateGroupModal from "./components/CreateGroupModal";
import BigFloatingCommsMenu from "./components/comms/BigFloatingCommsMenu";
import SmallCommsMenu from "./components/comms/SmallCommsMenu";
import methods from "./utils/webrtc/methods";
const { get, check } = methods;
import Icon from "./components/Icon";
import SmartBackground from "./components/SmartBackground";
import HeaderBase from "./components/HeaderBase";
import Database from "./utils/storage/database";
import chatUtils from "./utils/chat";

// Hooks
import useAppInit from "./hooks/useAppInit";

const AppContainer = () => {
  useAppInit(true);

  const [selectedChatUUID, setSelectedChatUUID] = useState(null);
  const [selectedHandle, setSelectedHandle] = useState(null);

  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [networkAvailable, setNetworkAvailable] = useState(false);
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

  // Callback memoizzata per selezione chat
  const onChatSelect = useCallback(
    (chatUUID) => {
      if (selectedChatUUID === chatUUID) return; // No-op if selecting already selected chat
      setSelectedChatUUID(chatUUID);
      router.push(`/chat/${chatUUID}`);
    },
    [isSmallScreen, router, selectedChatUUID]
  );

  // useEffect per screen size e params
  useEffect(() => {
    const updateScreenSize = () => {
      const { width } = Dimensions.get("window");
      setIsSmallScreen(width <= 768);
    };
    Dimensions.addEventListener("change", updateScreenSize);
    updateScreenSize();

    // Always set selectedChatUUID when route params include chatUUID.
    if (params.chatUUIDorHandle) {
      if (params.chatUUIDorHandle == selectedChatUUID) return; // no-op if already selected

      const { chatUUID, chatHandle } = chatUtils.getChatUUIDAndHandle(params);
      setSelectedChatUUID(chatUUID);
      setSelectedHandle(chatHandle);
    }
  }, [params.chatUUIDorHandle]);

  // useEffect per network e back button
  useEffect(() => {
    const checkConnection = NetInfo.addEventListener((state) => {
      setNetworkAvailable(state.isConnected);
    });

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
      checkConnection();
    };
  }, [isSmallScreen, selectedChatUUID]);

  useEffect(() => {
    if (isSmallScreen) {
      Animated.timing(chatContentPosition, {
        toValue: selectedChatUUID ? 0 : Dimensions.get("window").width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedChatUUID, isSmallScreen, chatContentPosition]);

  // Ensure overlay is positioned correctly on mount (avoid flash)
  useEffect(() => {
    if (isSmallScreen) {
      // set initial value without animation
      chatContentPosition.setValue(
        selectedChatUUID ? 0 : Dimensions.get("window").width
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

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  // COMMS ROBA NON TOCCARE
  // useEffect per comms events
  useEffect(() => {
    const handleCommsStateChange = (data) => {
      if (data.from === get.myPartecipantId()) {
        setForceUpdate((prev) => prev + 1);
      }
    };
    eventEmitter.on("member_joined_comms", handleCommsStateChange);
    eventEmitter.on("member_left_comms", handleCommsStateChange);
    return () => {
      eventEmitter.off("member_joined_comms", handleCommsStateChange);
      eventEmitter.off("member_left_comms", handleCommsStateChange);
    };
  }, []);

  // Funzioni per menu comms (memoizzate)
  const shouldShowBigFloatingCommsMenu = useCallback(() => {
    if (isSmallScreen) return false;
    const isInComms = check.isInComms();
    if (isInComms) {
      const commsId = get.commsId();
      if (selectedChatUUID !== commsId) return true;
      return selectedChatUUID === commsId && "chat" === "chat"; // contentView da ChatContainer ora
    }
    return false;
  }, [isSmallScreen, selectedChatUUID, forceUpdate]);

  const renderBigFloatingCommsMenu = () =>
    shouldShowBigFloatingCommsMenu() ? <BigFloatingCommsMenu /> : null;

  const shouldShowSmallCommsMenu = useCallback(() => {
    if (!isSmallScreen) return false;
    const isInComms = check.isInComms();
    if (isInComms) {
      const commsId = get.commsId();
      if (selectedChatUUID !== commsId) return true;
      return selectedChatUUID === commsId && "chat" === "chat";
    }
    return false;
  }, [isSmallScreen, selectedChatUUID, forceUpdate]);

  const renderSmallCommsMenu = () =>
    shouldShowSmallCommsMenu() ? <SmallCommsMenu /> : null;

  // COMMS ROBA NON TOCCARE

  const renderHeader = () => (
    <HeaderBase>
      <Icon name={"Menu02Icon"} size={32} onPress={toggleSidebar} />
      <Text style={styles.headerTitle}>Chats</Text>
      <Icon
        name={"Search02Icon"}
        size={32}
        onPress={() => setIsToggleSearchChats(!isToggleSearchChats)}
        style={styles.searchButton}
      />
    </HeaderBase>
  );

  // Render ChatContainer solo se selezionata
  const renderChatView = () => {
    return (
      <ChatContainer
        onBack={() => {
          setSelectedChatUUID(null);
          setSelectedHandle(null);
          router.back();
        }}
        theme={theme}
        isSmallScreen={isSmallScreen}
        chatUUID={selectedChatUUID}
        chatHandle={selectedHandle}
      />
    );
  };

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
              {/* Passa props a ChatList: selectedChatUUID e onChatSelect */}
              {renderHeader()}
              <ChatList
                selectedChatUUID={selectedChatUUID}
                onChatSelect={onChatSelect}
                isToggleSearchChats={isToggleSearchChats}
                setIsToggleSearchChats={setIsToggleSearchChats}
                isSmallScreen={isSmallScreen}
                theme={theme}
                colorScheme={colorScheme}
              />
            </View>
            {/* Always mount the overlay to avoid unmount/remount of ChatContainer when toggling selection.
                Visibility is controlled by translateX and pointerEvents so ChatList won't re-render due to
                subtree mounting changes. */}
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
                colors={theme?.backgroundChatGradient}
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
              {renderHeader()}
              <ChatList
                selectedChatUUID={selectedChatUUID}
                onChatSelect={onChatSelect}
                isToggleSearchChats={isToggleSearchChats}
                setIsToggleSearchChats={setIsToggleSearchChats}
                isSmallScreen={isSmallScreen}
                theme={theme}
                colorScheme={colorScheme}
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
      {!networkAvailable && (
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
      borderRightWidth: 1,
      borderRightColor: theme.chatDivider,
    },
    chatContent: {
      padding: 0,
      flex: 1,
    },
    chatContentOverlay: {
      // Nuovo per overlay animato small screen
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
      backgroundColor: theme.backgroundChat,
    },
    chatListWrapper: {
      flex: 1,
      position: "relative",
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
  });
}

export default AppContainer;
