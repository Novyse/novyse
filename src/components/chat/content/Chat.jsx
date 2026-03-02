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
import database from "@/src/utils/storage/database";

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

import UploadFileModal from "@/src/components/modalSheets/uploadFile";

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
  const [editingMessage, setEditingMessage] = useState(null);
  const [mentionMembers, setMentionMembers] = useState([]);

  const { selectedChatUUID, setSelectedChatUUID, selectedHandle } =
    useContext(ChatContext);
  const { chat, messages, members, loading, loadMoreMessages } = useChatData(
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
  const {
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleSendFileMessage,
    handleTextChanging,
  } = useMessageHandlers(
    chat,
    myUUID,
    setNewMessageText,
    setEditingMessage,
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

  // --- Stable callbacks for Reply / Edit ---

  const handleReply = useCallback((msg) => {
    setReplyingTo(msg);
    setEditingMessage(null); // clear edit when replying
    setNewMessageText("");
  }, []);

  const handleEdit = useCallback((msg) => {
    setEditingMessage(msg);
    setNewMessageText(msg.content || "");
    setReplyingTo(null); // clear reply when editing
    textInputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setNewMessageText("");
  }, []);

  const handleDelete = useCallback(
    (msg) => {
      handleDeleteMessage(msg.id);
    },
    [handleDeleteMessage],
  );

  const onSelectMention = useCallback((member) => {
    setNewMessageText((prev) => {
      const lastAtIndex = prev.lastIndexOf("@");
      if (lastAtIndex === -1) return prev;
      return prev.substring(0, lastAtIndex) + `@${member.handle} `;
    });
    setMentionMembers([]);
    textInputRef.current?.focus();
  }, []);

  const handleTextChange = useCallback(
    (text) => {
      setNewMessageText(text);
      handleTextChanging(text, isMicClicked);

      // Robust mention detection: look for "@" at the end of the text or preceded by space
      const mentionMatch = text.match(/(?:^|\s)@(\w*)$/);
      if (mentionMatch) {
        const query = mentionMatch[1].toLowerCase();
        const filtered = members.filter(
          (m) =>
            m.uuid !== myUUID &&
            ((m.handle && m.handle.toLowerCase().includes(query)) ||
              (m.name && m.name.toLowerCase().includes(query)) ||
              (m.surname && m.surname.toLowerCase().includes(query))),
        );
        setMentionMembers(filtered);
      } else {
        setMentionMembers([]);
      }
    },
    [members, myUUID, handleTextChanging, isMicClicked],
  );

  const handleSendOrEdit = useCallback(
    (type, content, files) => {
      if (editingMessage) {
        handleEditMessage(editingMessage.id, content);
      } else {
        let replyTo = undefined;
        if (replyingTo) {
          replyTo = { chatUUID: replyingTo.chatUUID, messageID: replyingTo.id };
        }
        setReplyingTo(null);
        handleSendMessage(type, content, replyTo, files);
      }
    },
    [editingMessage, replyingTo, handleSendMessage, handleEditMessage],
  );

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
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLoadMore={loadMoreMessages}
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
            onTextChange={handleTextChange}
            onSendMessage={handleSendOrEdit}
            isAttachMenuOpen={isAttachMenuOpen}
            onToggleAttachMenu={handleToggleAttachMenu}
            onToggleEmoji={toggleEmojiPicker}
            onInputFocus={onInputFocus}
            setBottomBarHeight={setBottomBarHeight}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            editingMessage={editingMessage}
            onCancelEdit={handleCancelEdit}
            mentionMembers={mentionMembers}
            onSelectMention={onSelectMention}
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
