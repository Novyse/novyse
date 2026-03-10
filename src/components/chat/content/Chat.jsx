import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { Platform, View, Text, StyleSheet } from "react-native";

import "react-native-get-random-values";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter.js";

import useMessageHandlers from "@/src/hooks/chat/useMessageHandlers.js";
import useAttachHandlers from "@/src/hooks/chat/useAttachHandlers.js";
import usePreparedMessages from "@/src/hooks/chat/usePreparedMessages.js";
import useClipboard from "@/src/hooks/useClipboard";
import useDownload from "@/src/hooks/file/useDownload";

import { ChatContext } from "@/context/ActiveChatContext";
import { ThemeContext } from "@/context/ThemeContext";
import { LocalUserContext } from "@/context/LocalUserContext";
import useChatStore from "@/context/ChatContext";

import BottomBar from "@/src/components/chat/content/bottomBar";
import MessageList from "@/src/components/chat/content/MessageList";
import UploadFileOverlay from "@/src/components/chat/content/UploadFileOverlay";
import UploadFileModal from "@/src/components/modalSheets/uploadFile";
import ChatIconsPickerModal from "@/src/components/ChatIconsPickerModal";

const ChatContent = ({ replyNavigation }) => {
  const { theme } = useContext(ThemeContext);

  const styles = createStyle(theme);
  const [newMessageText, setNewMessageText] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [mentionMembers, setMentionMembers] = useState([]);

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isFileModalVisible, setIsFileModalVisible] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);

  const [isMicClicked, setIsMicClicked] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(-1);

  const [replyingTo, setReplyingTo] = useState([]);

  const { selectedChatUUID, setSelectedChatUUID, selectedHandle } =
    useContext(ChatContext);
  const selectChat = useChatStore((state) => state.selectChat);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  useEffect(() => {
    selectChat(selectedChatUUID, selectedHandle);
  }, [selectedChatUUID, selectedHandle, selectChat]);

  const chat = useChatStore(
    useCallback(
      (state) =>
        state.chats.find(
          (c) =>
            c.uuid === selectedChatUUID ||
            (selectedHandle && c.handle === selectedHandle),
        ),
      [selectedChatUUID, selectedHandle],
    ),
  );

  const messages = chat?.messages;
  const members = chat?.members;

  const loading = useChatStore(
    useCallback(
      (state) =>
        state.loadingMessages[selectedChatUUID || selectedHandle || ""] ||
        false,
      [selectedChatUUID, selectedHandle],
    ),
  );

  const editedMessages = chat?.editedMessages || [];
  const pinnedMessages = chat?.pinnedMessages || [];

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
    handlePinMessage,
    handleUnpinMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleSendFileMessage,
    handleCancelJob,
    handleReaction,
    handlePausePendingMessage,
    handleUpdatePendingMessage,
  } = useMessageHandlers(
    chat,
    myUUID,
    setNewMessageText,
    setEditingMessage,
    setIsMicClicked,
  );

  const { attachType, handleMenuItemPress, handleFilePick } = useAttachHandlers(
    setIsAttachMenuOpen,
    setSheetIndex,
    bottomSheetRef,
    setIsFileModalVisible,
  );

  const { copyToClipboard } = useClipboard();
  const { downloadFile } = useDownload();

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

  const toggleEmojiPicker = useCallback(() => {
    if (Platform.OS === "web") {
      setIsEmojiPickerVisible(!isEmojiPickerVisible);
    }
  }, [isEmojiPickerVisible]);

  const handleEmojiSelected = useCallback(
    (emoji) => {
      setNewMessageText((prevText) => prevText + emoji);
    },
    [setNewMessageText],
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

  const handleReply = useCallback(
    (msg) => {
      if (replyingTo.length >= 3) {
        setReplyingTo((prev) => [...prev.slice(1), msg]);
        return;
      }
      setReplyingTo((prev) => {
        if (prev.find((r) => r.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setEditingMessage(null); // clear edit when replying
    },
    [replyingTo],
  );

  const handleEdit = useCallback(
    async (msg) => {
      if (msg.internal) {
        const paused = await handlePausePendingMessage(msg.id);
        if (paused) {
          msg.isPendingEdit = true;
        }
      }
      setEditingMessage(msg);
      setNewMessageText(msg.content || "");
      setReplyingTo([]); // clear reply when editing
      textInputRef.current?.focus();
    },
    [handlePausePendingMessage],
  );

  const handleCancelReply = useCallback((messageID) => {
    if (!messageID) {
      setReplyingTo([]);
    } else {
      setReplyingTo((prev) => prev.filter((r) => r.id !== messageID));
    }
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
    [members, myUUID, isMicClicked],
  );

  const handlePin = useCallback(
    (msg) => {
      handlePinMessage(msg.id);
    },
    [handlePinMessage],
  );

  const handleUnpin = useCallback(
    (msg) => {
      handleUnpinMessage(msg.id);
    },
    [handleUnpinMessage],
  );

  const handleCopy = useCallback((msg) => {
    copyToClipboard(msg.content);
  }, []);

  const handleDownload = useCallback((msg) => {
    downloadFile(msg.files);
  }, []);

  const handleSendOrEdit = useCallback(
    (type, content, files) => {
      if (editingMessage) {
        // If content is the same then do nothing
        if (editingMessage.content === content) {
          setEditingMessage(null);
          setNewMessageText("");
          return;
        }
        if (editingMessage.isPendingEdit || editingMessage.internal) {
          handleUpdatePendingMessage(editingMessage.id, content);
        } else {
          handleEditMessage(editingMessage.id, content, editingMessage.content);
        }
      } else {
        const replyTos = replyingTo.map((msg) => ({
          chatUUID: msg.chatUUID,
          messageID: msg.id,
        }));
        setReplyingTo([]);
        handleSendMessage(type, content, files, replyTos);
      }
    },
    [
      editingMessage,
      replyingTo,
      handleSendMessage,
      handleEditMessage,
      handleUpdatePendingMessage,
    ],
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
            replyNavigation={replyNavigation}
            preparedMessages={preparedMessages}
            editedMessages={editedMessages}
            pinnedMessages={pinnedMessages}
            myUUID={myUUID}
            theme={theme}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onReply={handleReply}
            onReaction={handleReaction}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onEdit={handleEdit}
            onCancel={handleCancelJob}
            onDelete={handleDelete}
            onLoadMore={() => loadMoreMessages(selectedChatUUID)}
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
