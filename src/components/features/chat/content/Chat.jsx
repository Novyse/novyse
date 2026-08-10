import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { View, StyleSheet, Keyboard, BackHandler } from "react-native";
import { handleChatShortcuts } from "@/src/utils/shortcut/chatShortcuts";

import {
  useReanimatedKeyboardAnimation,
  useKeyboardHandler,
} from "react-native-keyboard-controller";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useMessageHandlers from "@/src/hooks/chat/useMessageHandlers";
import useAttachHandlers from "@/src/hooks/chat/useAttachHandlers";
import usePreparedMessages from "@/src/hooks/chat/usePreparedMessages";
import useClipboard from "@/src/hooks/useClipboard";
import useDownload from "@/src/hooks/file/useDownload";
import useActivityEmitter from "@/src/hooks/chat/useActivityEmitter";
import { useForward } from "@/src/hooks/chat/useForward";

import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/store/UserStore";
import useChatStore from "@/src/context/ChatContext";
import { useKeyboardStore } from "@/src/context/KeyboardContext";

import BottomBar from "@/src/components/features/chat/bottomBar/ChatBottomBar";
import MessageList from "@/src/components/features/chat/content/MessageList";
import UploadFileOverlay from "@/src/components/features/modalSheets/uploadFile/UploadFileOverlay";
import { EmojiMenuOverlay } from "@/src/components/features/chat/content/emoji/EmojiMenuOverlay";
import DeleteMessageModal from "@/src/components/features/modalSheets/DeleteMessage";
import WebDropZone from "@/src/components/ui/input/WebDropZone";

import { validateFiles } from "@/src/utils/storage/file/validators";
import Platform from "@/src/utils/device/type";
import { hasPermission, PERMISSIONS } from "@/src/utils/chat/permissions";

import SubList from "@/src/components/features/sub/subList/SubList";
import PanelResizeHandle from "@/src/components/layout/PanelResizeHandle";
import useWindowSizeStore, {
  SUBLIST_MIN,
  CHAT_MIN,
} from "@/src/context/WindowSizeContext";
import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";
import { useScreen } from "@/src/context/ScreenContext";

const ChatContent = () => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { isSmallScreen } = useScreen();
  const { subListWidth, setSubListWidth } = useWindowSizeStore();

  const styles = createStyle(theme);
  const [mentionMembers, setMentionMembers] = useState([]);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const savedKeyboardHeight = useKeyboardStore((state) => state.keyboardHeight);
  const setSavedKeyboardHeight = useKeyboardStore(
    (state) => state.setKeyboardHeight,
  );

  const lastKeyboardHeight = useSharedValue(savedKeyboardHeight);
  const panelLift = useSharedValue(0);
  const { height: kbHeightAnim } = useReanimatedKeyboardAnimation();

  useEffect(() => {
    if (savedKeyboardHeight !== lastKeyboardHeight.value) {
      lastKeyboardHeight.value = savedKeyboardHeight;
    }
  }, [savedKeyboardHeight]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", (e) => {
      if (e.endCoordinates && e.endCoordinates.height > 10) {
        setSavedKeyboardHeight(e.endCoordinates.height);
      }
    });
    return () => sub.remove();
  }, [setSavedKeyboardHeight]);

  useKeyboardHandler(
    {
      onMove: (e) => {
        "worklet";
        if (e.height > lastKeyboardHeight.value) {
          lastKeyboardHeight.value = e.height;
        }
      },
      onEnd: (e) => {
        "worklet";
        if (e.height > 10) {
          if (lastKeyboardHeight.value !== e.height) {
            lastKeyboardHeight.value = e.height;
          }

          if (panelLift.value > 0) {
            panelLift.value = 0;
          }
        }
      },
    },
    [],
  );

  const panelAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    const maxH = lastKeyboardHeight.value;
    return {
      height: maxH,
      transform: [{ translateY: maxH - panelLift.value }],
    };
  });

  const listAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    const k = -kbHeightAnim.value;
    const maxLift = Math.max(k, panelLift.value);
    const effectiveLift =
      maxLift > 0 ? Math.max(0, maxLift - insets.bottom) : 0;

    return {
      transform: [{ translateY: -effectiveLift }],
    };
  });

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

  const chat = useActiveChatStore((state) => state.activeChatData);
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const isForum = chat?.type === "FORUM";

  const subListResizerHandlers = usePanelResizer({
    currentWidth: subListWidth,
    setWidth: setSubListWidth,
    minWidth: SUBLIST_MIN,
    maxWidthPadding: CHAT_MIN,
    reverse: false,
  });
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

  const messages = React.useMemo(() => {
    const all = chat?.messages;
    if (!all || chat?.type !== "FORUM") return all; // @SamueleOrazioDurante chat.type === "DM" && impostazione subs abilitata
    return all.filter((m) => m.subID === selectedSub);
  }, [chat?.messages, chat?.type, selectedSub]);
  const editedMessages = chat?.editedMessages || [];
  const pinnedMessages = chat?.pinnedMessages || [];

  const allUsers = useUserStore((state) => state.users);
  const members = React.useMemo(() => {
    return (chat?.members || []).map((m) => {
      const user = allUsers[m.uuid];
      return {
        ...m,
        handle: user.handle,
        name: user.name,
        surname: user?.surname || "",
        profilePictureUUID: user.profilePictureUUID,
      };
    });
  }, [chat?.members, allUsers]);
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

  const preparedMessages = usePreparedMessages(messages, chat.type);

  useEffect(() => {
    textInputRef.current?.focus();
  }, []);

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
  } = useMessageHandlers(setNewMessageText, setEditingMessage, textInputRef);

  const startScreenRecordingRef = useRef(null);
  const handleStartScreenRecording = useCallback(() => {
    startScreenRecordingRef.current?.();
  }, []);

  const { handleMenuItemPress } = useAttachHandlers(
    setIsAttachMenuOpen,
    handleStartScreenRecording,
  );

  const { startForwarding } = useForward();

  const handleForward = useCallback(
    (msg) => {
      startForwarding([msg]);
    },
    [startForwarding],
  );

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
    if (Platform !== "mobile") {
      setIsEmojiPickerVisible((prev) => !prev);
      return;
    }

    if (isEmojiPickerVisible) {
      setIsEmojiPickerVisible(false);

      setTimeout(() => {
        textInputRef.current?.blur();
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 50);
      }, 100);

      return;
    }
    const liveKbHeight = -kbHeightAnim.value;

    if (liveKbHeight > 10) {
      const target = Math.max(liveKbHeight, lastKeyboardHeight.value);
      lastKeyboardHeight.value = target;
      panelLift.value = target;
      Keyboard.dismiss();
    } else {
      panelLift.value = withTiming(lastKeyboardHeight.value, {
        duration: 250,
      });
    }
    setIsEmojiPickerVisible(true);
  }, [isEmojiPickerVisible, kbHeightAnim, panelLift, lastKeyboardHeight]);

  const handleEmojiSelected = useCallback(
    (emoji) => {
      setNewMessageText((prevText) => prevText + emoji);
    },
    [setNewMessageText],
  );

  const handleToggleAttachMenu = useCallback(() => {
    setIsAttachMenuOpen((prev) => !prev);
  }, []);

  const onInputFocus = useCallback(() => {
    setIsEmojiPickerVisible(false);
    setIsAttachMenuOpen(false);
  }, []);

  const handleEmojiOverlayClose = useCallback(() => {
    if (Platform !== "mobile") {
      setIsEmojiPickerVisible(false);
      return;
    }
    setIsEmojiPickerVisible(false);
    panelLift.value = withTiming(0, { duration: 220 });
  }, [panelLift]);

  useEffect(() => {
    if (Platform === "mobile" && isEmojiPickerVisible) {
      const backAction = () => {
        handleEmojiOverlayClose();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );

      return () => backHandler.remove();
    }
  }, [isEmojiPickerVisible, handleEmojiOverlayClose]);

  const handleReply = useCallback(
    (msg, rangeStart, rangeEnd) => {
      setReplyingTo((prev) => {
        if (
          prev.find(
            (r) =>
              r.id === msg.id &&
              r.rangeStart === rangeStart &&
              r.rangeEnd === rangeEnd,
          )
        )
          return prev;
        if (prev.length >= 3) {
          return [...prev.slice(1), { ...msg, rangeStart, rangeEnd }];
        }
        return [...prev, { ...msg, rangeStart, rangeEnd }];
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

  const handlePressArrowUp = useCallback(() => {
    if (newMessageText !== "") return;
    if (!messages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.senderUUID === myUUID) {
      handleEdit(lastMessage);
    } else {
      handleReply(lastMessage);
    }
  }, [messages, myUUID, handleEdit, handleReply, newMessageText]);

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

  const onChangeMention = useCallback(
    ({ indicator, text }) => {
      if (chat?.type === "DM") {
        setMentionMembers([]);
        return;
      }
      const query = text.toLowerCase();
      const filtered = members.filter(
        (m) =>
          m.uuid !== myUUID &&
          m.handle &&
          m.handle.toLowerCase().includes(query),
      );
      setMentionMembers(filtered);
    },
    [members, myUUID, chat?.type],
  );

  const onEndMention = useCallback(() => {
    setMentionMembers([]);
  }, []);

  const onSelectMention = useCallback(
    (member) => {
      if (
        Platform !== "web" &&
        Platform !== "desktop" &&
        textInputRef.current?.insertMention
      ) {
        textInputRef.current.insertMention(
          `@${member.handle}`,
          `/profile/${member.handle}`,
        );
      } else {
        // Web / Desktop standard TextInput fallback - inserts plain text as before
        setNewMessageText((prev) => {
          const lastAtIndex = prev.lastIndexOf("@");
          if (lastAtIndex === -1) return prev;
          return prev.substring(0, lastAtIndex) + `@${member.handle} `;
        });
        setMentionMembers([]);
        textInputRef.current?.focus();
      }
    },
    [textInputRef],
  );

  const handleTextChange = useCallback(
    (text) => {
      setNewMessageText(text);

      // Mention detection via Regex only on Web/Desktop
      if (Platform === "web" || Platform === "desktop") {
        if (chat?.type === "DM") {
          setMentionMembers([]);
          return;
        }
        const mentionMatch = text.match(/(?:^|\s)@(\w*)$/);
        if (mentionMatch) {
          const query = mentionMatch[1].toLowerCase();
          const filtered = members.filter(
            (m) =>
              m.uuid !== myUUID &&
              m.handle &&
              m.handle.toLowerCase().includes(query),
          );
          setMentionMembers(filtered);
        } else {
          setMentionMembers([]);
        }
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
      setMentionMembers([]); // @SamueleOrazioDurante da rimuovere quando web avrà la stessa textinput di markdown

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
          subID: msg.subID,
          messageID: msg.id,
          rangeStart: msg.rangeStart,
          rangeEnd: msg.rangeEnd,
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
  const handleAttachMenuItemPress = async (action) => {
    const newFiles = await handleMenuItemPress(action);
    if (newFiles) {
      handleAppendFilesToDraft(newFiles);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      handleChatShortcuts(e, {
        editingMessage,
        replyingTo,
        onCancelEdit: handleCancelEdit,
        onCancelReply: handleCancelReply,
        onPressArrowUp: handlePressArrowUp,
        isInputEmpty: newMessageText === "",
      });
    };
    if (Platform === "web" || Platform === "desktop") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    editingMessage,
    replyingTo,
    handleCancelEdit,
    handleCancelReply,
    handlePressArrowUp,
    newMessageText,
  ]);

  if (loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WebDropZone onFilesDropped={handleAppendFilesToDraft} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, listAnimatedStyle]}>
          {isForum ? (
            <View style={{ flex: 1, flexDirection: "row" }}>
              <SubList
                chat={chat}
                selectedSub={selectedSub}
                isSmallScreen={isSmallScreen}
                subListWidth={subListWidth}
                bottomBarHeight={bottomBarHeight}
                hasActionBars={!!(editingMessage || (replyingTo && replyingTo.length > 0))}
              />
              <View
                style={{
                  flex: 1,
                  height: "100%",
                  minWidth: isSmallScreen ? 0 : CHAT_MIN,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {!isSmallScreen && (
                  <PanelResizeHandle panHandlers={subListResizerHandlers} />
                )}
                <MessageList
                  ref={flatListRef}
                  preparedMessages={preparedMessages}
                  editedMessages={editedMessages}
                  pinnedMessages={pinnedMessages}
                  selectedMessages={selectedMessages}
                  setSelectedMessages={setSelectedMessages}
                  myUUID={myUUID}
                  onRead={handleRead}
                  onPin={handlePin}
                  onUnpin={handleUnpin}
                  onReply={handleReply}
                  onReaction={handleReaction}
                  onCopy={handleCopy}
                  onDownload={handleDownload}
                  onEdit={handleEdit}
                  onEditMessage={handleEditMessage}
                  onForward={handleForward}
                  onCancel={handleCancelJob}
                  onDelete={handleDelete}
                  onLoadMore={() => loadMoreMessages(selectedChatUUID)}
                  bottomBarHeight={bottomBarHeight}
                />
              </View>
            </View>
          ) : (
            <MessageList
              ref={flatListRef}
              preparedMessages={preparedMessages}
              editedMessages={editedMessages}
              pinnedMessages={pinnedMessages}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              myUUID={myUUID}
              onRead={handleRead}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onReply={handleReply}
              onReaction={handleReaction}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onEdit={handleEdit}
              onEditMessage={handleEditMessage}
              onForward={handleForward}
              onCancel={handleCancelJob}
              onDelete={handleDelete}
              onLoadMore={() => loadMoreMessages(selectedChatUUID)}
              bottomBarHeight={bottomBarHeight}
            />
          )}
        </Animated.View>
        {Platform === "mobile" && (
          <Animated.View
            style={[styles.emojiPanelContainer, panelAnimatedStyle]}
            pointerEvents={isEmojiPickerVisible ? "auto" : "none"}
          >
            <EmojiMenuOverlay
              isVisible={isEmojiPickerVisible}
              onClose={handleEmojiOverlayClose}
              onSelectResult={(content, type) => {
                if (type === "emoji") {
                  handleEmojiSelected(content);
                } else if (type === "gif") {
                  handleSendOrEdit("message", content);
                  handleEmojiOverlayClose();
                }
              }}
            />
          </Animated.View>
        )}
        {(() => {
          const subType = chat?.subs?.find((s) => s.id === selectedSub)?.type;
          const canSendText = ["MIXED", "TEXT", "ANNOUNCE"].includes(subType);

          if (!canSendText) return null;

          const isDMorGroup = chat?.type === "DM" || chat?.type === "GROUP";
          const myMember = chat?.members?.find(
            (m) => (m.uuid || m.userUUID) === myUUID,
          );
          const myRoleIDs = myMember?.roleIDs || [];
          const myRoles = (chat?.roles || []).filter((r) =>
            myRoleIDs.some((id) => Number(r.id) === Number(id)),
          );

          const canSendMessage =
            isDMorGroup ||
            hasPermission(myRoles, PERMISSIONS.SEND_MESSAGE, subType);

          return (
            <Animated.View
              style={[styles.bottomBarContainer, listAnimatedStyle]}
            >
              <BottomBar
                chatType={chat?.type}
                readOnly={!canSendMessage}
                newMessageText={newMessageText}
                files={files}
                textInputRef={textInputRef}
                onTextChange={handleTextChangeWithActivity}
                onSendMessage={handleSendOrEdit}
                onFileAppend={handleAppendFilesToDraft}
                isAttachMenuOpen={isAttachMenuOpen}
                onToggleAttachMenu={handleToggleAttachMenu}
                isEmojiPickerVisible={isEmojiPickerVisible}
                onToggleEmoji={toggleEmojiPicker}
                onInputFocus={onInputFocus}
                setBottomBarHeight={setBottomBarHeight}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                editingMessage={editingMessage}
                onCancelEdit={handleCancelEdit}
                mentionMembers={mentionMembers}
                onSelectMention={onSelectMention}
                onChangeMention={onChangeMention}
                onEndMention={onEndMention}
                onRecordingActivityChange={emitRecording}
                onPressArrowUp={handlePressArrowUp}
                startScreenRecordingRef={startScreenRecordingRef}
              />
            </Animated.View>
          );
        })()}
        {Platform !== "mobile" && (
          <EmojiMenuOverlay
            isVisible={isEmojiPickerVisible}
            onClose={handleEmojiOverlayClose}
            onSelectResult={(content, type) => {
              if (type === "emoji") {
                handleEmojiSelected(content);
              } else if (type === "gif") {
                handleSendOrEdit("message", content);
                handleEmojiOverlayClose();
              }
            }}
          />
        )}

        <UploadFileOverlay
          visible={isAttachMenuOpen}
          onClose={() => setIsAttachMenuOpen(false)}
          onMenuItemPress={handleAttachMenuItemPress}
          onFileSelected={handleAppendFilesToDraft}
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
    bottomBarContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
    },
    emojiPanelContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      overflow: "hidden",
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
