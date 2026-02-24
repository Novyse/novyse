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

import ChatIconsPickerModal from "@/src/components/ChatIconsPickerModal";

import gateway from "@/src/utils/backend-services/api-gateway";

import eventEmitter from "@/src/utils/global/Events/EventEmitter.js";

// Hooks
import useChatData from "@/src/hooks/chat/useChatData.js";
import useMessageHandlers from "@/src/hooks/chat/useMessageHandlers.js";
import useAttachHandlers from "@/src/hooks/chat/useAttachHandlers.js";
import usePreparedMessages from "@/src/hooks/chat/usePreparedMessages.js";

// Context
import { ChatContext } from "@/context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";
import { LocalUserContext } from "@/context/LocalUserContext";

// Keyboard Controller
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// New Components
import BottomBar from "@/src/components/chat/content/bottomBar";
import MessageList from "@/src/components/chat/content/MessageList";
import UploadFileOverlay from "@/src/components/chat/content/UploadFileOverlay";

import UploadFileModal from "@/src/components/modals/uploadFile";

const ChatContent = ({ onBack, contentView }) => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  const styles = createStyle(theme);
  const [newMessageText, setNewMessageText] = useState("");
  const [isVoiceMessage, setVoiceMessage] = useState(true);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isFileModalVisible, setIsFileModalVisible] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isMicClicked, setIsMicClicked] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const [replyingTo, setReplyingTo] = useState(null);

  const { selectedChatUUID, setSelectedChatUUID, selectedHandle } =
    useContext(ChatContext);
  const { chat, messages, setMessages, loading } = useChatData(
    selectedChatUUID,
    selectedHandle,
  );
  const { userUUID: myUUID } = useContext(LocalUserContext);

  const flatListRef = useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const textInputRef = useRef(null);
  const bottomSheetRef = useRef(null);

  // Hook per prepared messages
  const preparedMessages = usePreparedMessages(messages);

  // Hook per message handlers
  const { handleSendMessage, handleSendFileMessage, handleTextChanging } =
    useMessageHandlers(
      chat,
      myUUID,
      setNewMessageText,
      setVoiceMessage,
      setIsMicClicked,
    );

  const { attachType, handleMenuItemPress, handleFilePick } = useAttachHandlers(
    setIsAttachMenuOpen,
    setSheetIndex,
    bottomSheetRef,
    setIsFileModalVisible,
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
      backAction,
    );
    return () => {
      backHandler.remove();
    };
  }, [chat.uuid, onBack]);

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
    [setNewMessageText, setVoiceMessage],
  );

  const handleSheetChange = useCallback((index) => {
    setSheetIndex(index);
    if (index === -1) {
      textInputRef.current?.focus();
      setIsAttachMenuOpen(false);
    }
  }, []);

  const handleToggleAttachMenu = useCallback(() => {
    if (sheetIndex === -1) {
      setSheetIndex(0);
      setIsAttachMenuOpen(true);
    } else {
      if (Platform.OS === "web") {
        setSheetIndex(-1);
        setIsAttachMenuOpen(false);
      } else {
        bottomSheetRef.current?.close();
        setIsAttachMenuOpen(false);
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
      <Text style={{ color: theme.text, textAlign: "center", marginTop: 20 }}>
        Loading chat...
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={StyleSheet.absoluteFill}>
          <MessageList
            ref={flatListRef}
            preparedMessages={preparedMessages}
            myUUID={myUUID}
            theme={theme}
            onReply={(msg) => setReplyingTo(msg)}
          />
        </View>
        <UploadFileModal
          visible={isFileModalVisible}
          onClose={() => {
            setIsFileModalVisible(false);
          }}
          type={attachType}
          handleFilePick={handleFilePick}
          handleSendMessage={handleSendFileMessage}
        />
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={30}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <BottomBar
            chat={chat}
            onJoin={handleJoin}
            newMessageText={newMessageText}
            textInputRef={textInputRef}
            onTextChange={(text) => {
              setNewMessageText(text);
              handleTextChanging(text, isMicClicked);
            }}
            onSendMessage={handleSendMessage}
            isAttachMenuOpen={isAttachMenuOpen}
            onToggleAttachMenu={handleToggleAttachMenu}
            onToggleEmoji={toggleEmojiPicker}
            onInputFocus={onInputFocus}
            setBottomBarHeight={setBottomBarHeight}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </KeyboardAvoidingView>

        <UploadFileOverlay
          platform={Platform.OS}
          sheetIndex={sheetIndex}
          onSheetChange={handleSheetChange}
          onMenuItemPress={handleMenuItemPress}
          onSendMessage={handleSendFileMessage}
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
    </View>
  );
};

export default ChatContent;

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
