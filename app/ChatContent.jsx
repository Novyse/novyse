import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import {
  Platform,
  View,
  Text,
  BackHandler,
  Animated,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";
import "react-native-get-random-values";
import SmartBackground from "./components/SmartBackground";
import ChatIconsPickerModal from "./components/ChatIconsPickerModal";

import gateway from "./utils/backend-services/api-gateway";

import eventEmitter from "./utils/global/Events/EventEmitter.js";

// Hooks
import useChatData from "./hooks/useChatData.js";
import useMessageHandlers from "./hooks/useMessageHandlers.js";
import usePreparedMessages from "./hooks/usePreparedMessages.js";

// Context
import { ChatContext } from "@/context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";
import { UserContext } from "@/context/UserContext";

// Keyboard Controller
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// New Components
import BottomBar from "./components/chat/content/BottomBar";
import MessageList from "./components/chat/content/MessageList";
import MenuSheet from "./components/chat/content/MenuSheet";

const ChatContent = ({ onBack, contentView }) => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  const styles = createStyle(theme);
  const [newMessageText, setNewMessageText] = useState("");
  const [isVoiceMessage, setVoiceMessage] = useState(true);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isMicClicked, setIsMicClicked] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(-1);

  const { selectedChatUUID, setSelectedChatUUID, selectedHandle } =
    useContext(ChatContext);
  const { chat, messages, setMessages, loading } = useChatData(
    selectedChatUUID,
    selectedHandle
  );
  const { userUUID: myUUID } = useContext(UserContext);

  const flatListRef = useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const textInputRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Hook per prepared messages
  const preparedMessages = usePreparedMessages(messages);

  // Hook per message handlers
  const {
    handleSendMessage,
    handleVoiceMessage,
    handleTextChanging,
    handleMenuItemPress,
  } = useMessageHandlers(
    chat,
    selectedChatUUID,
    setSelectedChatUUID,
    setMessages,
    setNewMessageText,
    setVoiceMessage,
    setIsMicClicked,
    sheetIndex // Per close menu in pickImage
  );

  const handleJoin = useCallback(async () => {
    const response = await gateway.chat.join(selectedHandle);
    const success = response.success;
    if (success) {
      const newChat = response.chat;
      const newMessages = response.messages;
      console.log("Chat joined successfully:", newChat);
      await eventEmitter.newChat(newChat, newMessages);
      setSelectedChatUUID(newChat.uuid);
    } else {
      console.error("Failed to join chat");
    }
  }, [selectedHandle, setSelectedChatUUID]);

  useEffect(() => {
    const backAction = () => {
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => {
      backHandler.remove();
    };
  }, [chat.uuid, onBack]);

  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: sheetIndex === 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sheetIndex]);

  const toggleEmojiPicker = useCallback(() => {
    if (Platform.OS === "web") {
      setIsEmojiPickerVisible(!isEmojiPickerVisible);
    }
  }, [isEmojiPickerVisible]);

  const handleEmojiSelected = useCallback(
    (emoji) => {
      setNewMessageText((prevText) => prevText + emoji);
      setVoiceMessage(false);
    },
    [setNewMessageText, setVoiceMessage]
  );

  const handleSheetChange = useCallback((index) => {
    setSheetIndex(index);
    if (index === -1) {
      textInputRef.current?.focus();
    }
  }, []);

  const handleToggleMenu = useCallback(() => {
    if (sheetIndex === -1) {
      setSheetIndex(0);
    } else {
      if (Platform.OS === "web") {
        setSheetIndex(-1);
      } else {
        bottomSheetRef.current?.close();
      }
    }
  }, [sheetIndex]);

  const onInputFocus = useCallback(() => {
    if (Platform.OS !== "web" && sheetIndex !== -1) {
      bottomSheetRef.current?.close();
    }
  }, [sheetIndex]);

  if (loading) {
    return (
      <SmartBackground
        backgroundKey="backgroundChatContentGradient"
        style={styles.container}
      />
    );
  }

  return (
    <SmartBackground
      backgroundKey="backgroundChatContentGradient"
      style={styles.container}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={90}
          enabled
        >
          <MessageList
            ref={flatListRef}
            preparedMessages={preparedMessages}
            myUUID={myUUID}
            theme={theme}
          />
          <BottomBar
            chat={chat}
            newMessageText={newMessageText}
            isVoiceMessage={isVoiceMessage}
            rotationAnim={rotationAnim}
            textInputRef={textInputRef}
            onTextChange={(text) => {
              setNewMessageText(text);
              handleTextChanging(text, isMicClicked);
            }}
            onSendMessage={() => handleSendMessage(newMessageText)}
            onVoiceMessage={handleVoiceMessage}
            onToggleMenu={handleToggleMenu}
            onToggleEmoji={toggleEmojiPicker}
            onInputFocus={onInputFocus}
            onJoin={handleJoin}
            theme={theme}
            setBottomBarHeight={setBottomBarHeight}
          />
        </KeyboardAvoidingView>

        <MenuSheet
          platform={Platform.OS}
          sheetIndex={sheetIndex}
          onSheetChange={handleSheetChange}
          onMenuItemPress={handleMenuItemPress}
          bottomSheetRef={bottomSheetRef}
          theme={theme}
        />

        <ChatIconsPickerModal
          visible={isEmojiPickerVisible}
          anchor={{ height: bottomBarHeight }}
          onEmojiSelected={handleEmojiSelected}
        >
          <View style={styles.emojiPickerContainer}>
            <Text style={styles.placeholderText}>Emoji Picker Content</Text>
          </View>
        </ChatIconsPickerModal>
      </GestureHandlerRootView>
    </SmartBackground>
  );
};

export default ChatContent;

// Stili ridotti (come prima)
function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    emojiPickerContainer: {
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      color: theme.text,
      fontSize: 16,
    },
  });
}
