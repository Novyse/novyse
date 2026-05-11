import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { Platform, View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";

import { KeyboardStickyView } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import useMessageHandlers from "@/src/hooks/chat/useMessageHandlers";
import useAttachHandlers from "@/src/hooks/chat/useAttachHandlers";
import usePreparedMessages from "@/src/hooks/chat/usePreparedMessages";
import useClipboard from "@/src/hooks/useClipboard";
import useDownload from "@/src/hooks/file/useDownload";
import useActivityEmitter from "@/src/hooks/chat/useActivityEmitter";
import { useForward } from "@/src/hooks/chat/useForward";

import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";
import useChatStore from "@/src/context/ChatContext";

import BottomBar from "@/src/components/chat/content/bottomBar";
import MessageList from "@/src/components/chat/content/MessageList";
import UploadFileOverlay from "@/src/components/chat/content/UploadFileOverlay";
import ChatIconsPickerModal from "@/src/components/ChatIconsPickerModal";
import DeleteMessageModal from "@/src/components/modalSheets/DeleteMessage";
import WebDropZone from "@/src/components/input/WebDropZone";

import { validateFiles } from "@/src/utils/storage/file/validators";

const ChatContent = () => {
  const { theme } = useContext(ThemeContext);

  const styles = createStyle(theme);
  const [mentionMembers, setMentionMembers] = useState([]);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);

  const [sheetIndex, setSheetIndex] = useState(-1);

  const myUUID = useUserStore((state) => state.localUserUUID);

  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  const selectedHandle = useActiveChatStore((state) => state.selectedHandle);
  const selectedMessages = useActiveChatStore(
    (state) => state.selectedMessages,
  );
  const setSelectedMessages = useActiveChatStore(
    (state) => state.setSelectedMessages,
  );
  const replyingTo = useActiveChatStore((state) => state.replyingTo);
  const setReplyingTo = useActiveChatStore((state) => state.setReplyingTo);
  const newMessageText = useActiveChatStore((state) => state.newMessageText);
  const setNewMessageText = useActiveChatStore(
    (state) => state.setNewMessageText,
  );
  const editingMessage = useActiveChatStore((state) => state.editingMessage);
  const setEditingMessage = useActiveChatStore(
    (state) => state.setEditingMessage,
  );
  const files = useActiveChatStore((state) => state.files);
  const setFiles = useActiveChatStore((state) => state.setFiles);
  const invalidFiles = useActiveChatStore((state) => state.invalidFiles);
  const setInvalidFiles = useActiveChatStore((state) => state.setInvalidFiles);

  const selectChat = useChatStore((state) => state.selectChat);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  useEffect(() => {
    if (selectedChatUUID) {
      selectChat(selectedChatUUID);
    }
  }, [selectedChatUUID, selectChat]);

  const { emitTyping, stopTyping, emitRecording } =
    useActivityEmitter(selectedChatUUID);

  const chat = useActiveChatStore((state) => state.activeChatData);

  const messages = chat?.messages;
  const editedMessages = chat?.editedMessages || [];
  const pinnedMessages = chat?.pinnedMessages || [];

  const members = chat?.members;
  const settings = chat?.settings || {
    file: {
      singleFileSize: 52428800,
      totalFileSize: 2147483648,
      maxFiles: 100,
    },
  };

  const loading = useChatStore(
    useCallback(
      (state) =>
        state.loadingMessages[selectedChatUUID || selectedHandle || ""] ||
        false,
      [selectedChatUUID, selectedHandle],
    ),
  );

  const flatListRef = useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const textInputRef = useRef(null);
  const bottomSheetRef = useRef(null);

  const preparedMessages = usePreparedMessages(messages, chat.type);

  const {
    handleSendMessage,
    handleReadMessage,
    handlePinMessage,
    handleUnpinMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleCancelJob,
    handleReaction,
    handlePausePendingMessage,
    handleUpdatePendingMessage,
  } = useMessageHandlers(setNewMessageText, setEditingMessage);

  const { handleMenuItemPress } = useAttachHandlers(
    setIsAttachMenuOpen,
    setSheetIndex,
    bottomSheetRef,
  );
  
  const { startForwarding } = useForward();

  const handleForward = useCallback((msg) => {
    startForwarding([msg]);
  }, [startForwarding]);

  const handleAppendFilesToDraft = useCallback(
    (newFiles) => {
      if (!newFiles || newFiles.length === 0) return;
      setFiles((prev) => {
        const merged = [...(prev || []), ...newFiles];

        const { invalidFilesData } = validateFiles(
          merged,
          "All",
          settings.file.maxFiles,
          settings.file.singleFileSize,
          settings.file.totalFileSize,
        );

        setInvalidFiles(invalidFilesData);
        return merged;
      });
    },
    [setFiles, setInvalidFiles, settings],
  );

  const { copyToClipboard } = useClipboard();
  const { downloadFile } = useDownload();

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
      setReplyingTo((prev) => {
        if (prev.find((r) => r.id === msg.id)) return prev;
        if (prev.length >= 3) {
          return [...prev.slice(1), msg];
        }
        return [...prev, msg];
      });
      setNewMessageText("");
      setEditingMessage(null); // clear edit when replying
    },
    [setReplyingTo, setNewMessageText, setEditingMessage],
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
      setMessageToDelete(msg);
    },
    [setMessageToDelete],
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
    [members, myUUID],
  );

  const handleTextChangeWithActivity = useCallback(
    (text) => {
      handleTextChange(text);
      if (text.length > 0) {
        emitTyping();
      }
    },
    [handleTextChange, emitTyping],
  );

  const handleRead = useCallback(
    (messageID) => {
      handleReadMessage(messageID);
    },
    [handleReadMessage],
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
    (type, content, extraFiles) => {
      if (invalidFiles.length > 0) {
        // Prevent sending if there are invalid files
        return;
      }

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
        const realContent = content || newMessageText;
        const allFiles = [...(files || []), ...(extraFiles || [])];
        const replyTos = replyingTo.map((msg) => ({
          chatUUID: msg.chatUUID,
          messageID: msg.id,
        }));
        setReplyingTo([]);

        setFiles([]);
        setInvalidFiles([]);
        handleSendMessage(type, realContent, allFiles, replyTos);
      }

      // Stop any current activity on send
      stopTyping();
    },
    [
      editingMessage,
      replyingTo,
      files,
      invalidFiles,
      handleSendMessage,
      handleEditMessage,
      handleUpdatePendingMessage,
      setFiles,
      setInvalidFiles,
      stopTyping,
    ],
  );

  const handleDraftMenuItemPress = async (action) => {
    const newFiles = await handleMenuItemPress(action);
    if (newFiles) {
      handleAppendFilesToDraft(newFiles);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WebDropZone onFilesDropped={handleAppendFilesToDraft} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={StyleSheet.absoluteFill}>
          <MessageList
            ref={flatListRef}
            preparedMessages={preparedMessages}
            editedMessages={editedMessages}
            pinnedMessages={pinnedMessages}
            selectedMessages={selectedMessages}
            setSelectedMessages={setSelectedMessages}
            myUUID={myUUID}
            theme={theme}
            onRead={handleRead}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onReply={handleReply}
            onReaction={handleReaction}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onEdit={handleEdit}
            onForward={handleForward}
            onCancel={handleCancelJob}
            onDelete={handleDelete}
            onLoadMore={() => loadMoreMessages(selectedChatUUID)}
          />
        </View>

        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <BottomBar
            newMessageText={newMessageText}
            files={files}
            textInputRef={textInputRef}
            onTextChange={handleTextChangeWithActivity}
            onSendMessage={handleSendOrEdit}
            onFileAppend={handleAppendFilesToDraft}
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
            onRecordingActivityChange={emitRecording}
          />
        </KeyboardStickyView>

        <UploadFileOverlay
          platform={Platform.OS}
          sheetIndex={sheetIndex}
          onSheetChange={handleSheetChange}
          onMenuItemPress={handleDraftMenuItemPress}
          onFileSelected={handleAppendFilesToDraft}
          bottomSheetRef={bottomSheetRef}
          theme={theme}
        />

        <DeleteMessageModal
          visible={!!messageToDelete}
          onClose={() => setMessageToDelete(null)}
          onDelete={() => handleDeleteMessage(messageToDelete.id)}
          messageCount={1}
          theme={theme}
          fullscreen={false}
        />

        <ChatIconsPickerModal
          visible={isEmojiPickerVisible}
          anchor={{ height: bottomBarHeight }}
          onEmojiSelected={handleEmojiSelected}
        >
          <View style={styles.emojiPickerContainer}>
            <AppText
              style={styles.placeholderText}
              text="Emoji Picker Content"
            />
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
