import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Platform,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  BackHandler,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";

import moment from "moment";
import { useRouter } from "expo-router";
import "react-native-get-random-values";
import Icon from "./components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import SmartBackground from "./components/SmartBackground";
import ChatIconsPickerModal from "./components/ChatIconsPickerModal";
import MessageBase from "./components/messages/MessageBase";
import MessageSystem from "./components/messages/MessageSystem";

import gateway from "./utils/backend-services/api-gateway";

import eventEmitter from "./utils/global/Events/EventEmitter.js";

// Hooks
import useChatData from "./hooks/useChatData.js";

// Context
import { ChatContext } from "../context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";
import { UserContext } from "@/context/UserContext";

// Keyboard Controller
import {
  KeyboardAvoidingView,
  OverKeyboardView,
} from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

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

  useEffect(() => {
    // gestisco quando l'utente vuole tornare alla pagina precedente
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

  // gestisco quando il microfono viene premuto
  // non ci sono ancora i messaggi vocali, ma intanto l'ho fatto
  const handleVoiceMessage = () => {
    console.log("Voice message button pressed");
    setIsMicClicked(true);
    setVoiceMessage(false);
  };

  // gestisco quando viene premuto il pulsante emoji
  const toggleEmojiPicker = () => {
    if (Platform.OS === "web") {
      setIsEmojiPickerVisible(!isEmojiPickerVisible);
    }
  };

  // gestisco quando viene selezionato un emoji
  const handleEmojiSelected = (emoji) => {
    setNewMessageText((prevText) => prevText + emoji);
    setVoiceMessage(false);
  };

  // gestisco quando viene chiuso l'emoji picker
  const handleEmojiPickerClose = () => {
    setIsEmojiPickerVisible(false);
  };

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

  const handleMenuItemPress = useCallback((action) => {
    if (Platform.OS === "web") {
      setSheetIndex(-1);
    } else {
      bottomSheetRef.current?.close();
    }
    console.log(`Action: ${action}`);
  }, []);

  const handleSendMessage = async () => {
    if (newMessageText.trim() === "") {
      return;
    }

    let currentChatUUID = chat.uuid;

    if (!chat.uuid) {
      // Create chat first
      const response = await gateway.chat.create("DM", chat.member, null, null);
      const success = response.success;
      const newChat = response.chat;
      if (success) {
        newChat.name = newChat.members[0].name;
        console.log("Chat created successfully:", newChat);
        await eventEmitter.newChat(newChat);
        setSelectedChatUUID(newChat.uuid);
        currentChatUUID = newChat.uuid;
      } else {
        console.error("Failed to create chat");
        return;
      }
    }

    const { success, message } = await gateway.message.send(
      currentChatUUID,
      newMessageText,
      "text"
    );
    if (success) {
      console.log("Message sent successfully:", message);
      await eventEmitter.newMessage(message);
      setMessages((currentMessages) => {
        const exists = currentMessages.some((msg) => msg.id === message.id);
        if (!exists) {
          return [message, ...currentMessages];
        }
        return currentMessages;
      });
    } else {
      console.error("Failed to send message");
    }

    setNewMessageText("");
    setVoiceMessage(true);
    setIsMicClicked(false);
  };

  const handleJoin = async () => {
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
  };

  // preparo i messaggi prima che vengano stampati --> aggiungo le date tra messaggi di giorni diversi
  const prepareMessages = useCallback((messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) return [];

    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const prepared = [];
    let lastDate = null;
    let lastDateDisplay = null;
    let groupMessages = [];

    sortedMessages.forEach((message) => {
      const messageDate = moment(message.created_at).format("YYYY-MM-DD");
      const displayDate = moment(message.created_at).format("MMMM D, YYYY");

      if (messageDate !== lastDate) {
        if (groupMessages.length > 0) {
          prepared.push(...groupMessages);
          prepared.push({
            type: "separator",
            data: lastDateDisplay,
            uniqueKey: `separator-${lastDate}`,
          });
        }
        groupMessages = [];
        lastDate = messageDate;
        lastDateDisplay = displayDate;
      }

      if (message.type === "system") {
        groupMessages.push({
          type: "system",
          data: message,
          uniqueKey: message.id,
        });
      } else {
        groupMessages.push({
          type: "text",
          data: message,
          uniqueKey: message.id,
        });
      }
    });

    if (groupMessages.length > 0) {
      prepared.push(...groupMessages);
      prepared.push({
        type: "separator",
        data: lastDateDisplay,
        uniqueKey: `separator-${lastDate}`,
      });
    }

    return prepared;
  }, []);

  const preparedMessages = useMemo(
    () => prepareMessages(messages),
    [messages, prepareMessages]
  );

  //gestisco quando il testo cambia nel textinput
  const handleTextChanging = (text) => {
    setNewMessageText(text);
    setVoiceMessage(text.length === 0 && !isMicClicked);
  };

  const renderBottomBar = () => {
    const showInputBar =
      chat.uuid || !["GROUP", "CHANNEL", "FORUM"].includes(chat.type);

    const animatedStyle = {
      transform: [
        {
          rotate: rotationAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "45deg"],
          }),
        },
      ],
    };

    return (
      <View
        style={styles.bottomBar}
        onLayout={(event) =>
          setBottomBarHeight(event.nativeEvent.layout.height)
        }
      >
        {showInputBar ? (
          <>
            <Animated.View style={[styles.icon, animatedStyle]}>
              <Icon name="PlusSignIcon" onPress={handleToggleMenu} />
            </Animated.View>

            <LinearGradient
              colors={theme.backgroundChatTextInputGradient}
              style={styles.textInputContainer}
            >
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                maxLength={2000}
                value={newMessageText}
                onChangeText={handleTextChanging}
                placeholder={"New message"}
                placeholderTextColor={theme.placeholderText}
                onSubmitEditing={
                  Platform.OS === "web" ? handleSendMessage : undefined
                }
                onFocus={onInputFocus}
                // multiline={true}
                // numberOfLines={5}
              />
              <Icon
                name="SmileIcon"
                style={styles.icon}
                onPress={toggleEmojiPicker}
              />
            </LinearGradient>

            {isVoiceMessage ? (
              <Icon
                name="Mic02Icon"
                onPress={handleVoiceMessage}
                style={styles.icon}
              />
            ) : (
              <Icon
                name="SentIcon"
                onPress={handleSendMessage}
                style={styles.icon}
              />
            )}
          </>
        ) : (
          <Pressable onPress={handleJoin} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>
              Join{" "}
              {chat.type.charAt(0).toUpperCase() +
                chat.type.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderMessageItem = ({ item }) => {
    if (item.type === "separator") {
      return <MessageSystem type={"date"} data={item.data} />;
    } else if (item.type === "system") {
      return <MessageSystem type={"system"} data={item.data} />;
    } else {
      const message = item.data;
      return (
        <MessageBase
          message={message}
          isSender={message.senderUUID === myUUID}
          onLongPress={(e) => {
            console.log("Long press on message:", message.id);
          }}
        />
      );
    }
  };

  const renderFloatingMenu = () =>
    Platform.OS === "web" &&
    sheetIndex === 0 && (
      <View style={styles.floatingMenuContainer}>
        <View style={styles.floatingMenu}>
          <View style={[styles.menuRow, { flex: 0 }]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("Gallery")}
            >
              <Ionicons name="images" size={32} color="royalblue" />
              <Text style={styles.menuText}>Gallery</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("File")}
            >
              <Ionicons name="document" size={32} color="gray" />
              <Text style={styles.menuText}>File</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => handleMenuItemPress("Camera")}
            >
              <Ionicons name="camera" size={32} color="darkorange" />
              <Text style={styles.menuText}>Camera</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );

  if (loading) {
    return (
      <SmartBackground
        backgroundKey="backgroundChatContentGradient"
        style={styles.container}
      ></SmartBackground>
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
          <FlatList
            ref={flatListRef}
            data={preparedMessages}
            keyExtractor={(item) => item.uniqueKey}
            renderItem={renderMessageItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            scrollIndicatorInsets={{ right: 1 }}
            inverted
          />
          {renderBottomBar()}
        </KeyboardAvoidingView>

        {renderFloatingMenu()}

        {Platform.OS !== "web" && (
          <OverKeyboardView visible={sheetIndex === 0}>
            <GestureHandlerRootView style={styles.fullScreen}>
              <TouchableWithoutFeedback
                style={styles.fullScreen}
                onPress={() => {
                  bottomSheetRef.current?.close();
                }}
              >
                <View style={styles.bottomSheetContainer}>
                  <BottomSheet
                    ref={bottomSheetRef}
                    index={sheetIndex}
                    onChange={handleSheetChange}
                    snapPoints={["60%"]}
                    backgroundStyle={styles.sheetBackground}
                    handleIndicatorStyle={styles.handleIndicator}
                    enablePanDownToClose={true}
                    enableDynamicSizing={false}
                    animateOnMount={false}
                  >
                    <View style={styles.sheetContent}>
                      <View style={styles.menuRow}>
                        <Pressable
                          style={styles.menuItem}
                          onPress={() => handleMenuItemPress("Gallery")}
                        >
                          <Ionicons name="images" size={32} color="royalblue" />
                          <Text style={styles.menuText}>Gallery</Text>
                        </Pressable>
                        <Pressable
                          style={styles.menuItem}
                          onPress={() => handleMenuItemPress("File")}
                        >
                          <Ionicons name="document" size={32} color="gray" />
                          <Text style={styles.menuText}>File</Text>
                        </Pressable>
                        <Pressable
                          style={styles.menuItem}
                          onPress={() => handleMenuItemPress("Camera")}
                        >
                          <Ionicons
                            name="camera"
                            size={32}
                            color="darkorange"
                          />
                          <Text style={styles.menuText}>Camera</Text>
                        </Pressable>
                      </View>
                    </View>
                  </BottomSheet>
                </View>
              </TouchableWithoutFeedback>
            </GestureHandlerRootView>
          </OverKeyboardView>
        )}
      </GestureHandlerRootView>
      <ChatIconsPickerModal
        visible={isEmojiPickerVisible}
        anchor={{ height: bottomBarHeight }}
        onEmojiSelected={handleEmojiSelected}
      >
        <View style={styles.emojiPickerContainer}>
          <Text style={styles.placeholderText}>Emoji Picker Content</Text>
        </View>
      </ChatIconsPickerModal>
    </SmartBackground>
  );
};

export default ChatContent;

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      padding: 10,
    },
    bottomBar: {
      width: "100%",
      paddingVertical: 10,
      paddingHorizontal: 5,
      flexDirection: "row",
      alignItems: "center",
      minHeight: 55,
    },
    textInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 5,
      marginHorizontal: 5,
      minHeight: 45,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      outlineStyle: "none",
      alignSelf: "stretch",
      marginLeft: 10,
    },
    icon: {
      width: 35,
      height: 35,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 5,
    },
    joinButton: {
      backgroundColor: theme.backgroundJoinChatButton,
      paddingHorizontal: 30,
      paddingVertical: 13,
      borderRadius: 25,
      alignSelf: "center",
      marginHorizontal: "auto",
    },
    joinButtonText: {
      fontSize: 18,
      color: theme.text,
      fontWeight: "bold",
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
    fullScreen: {
      flex: 1,
    },
    bottomSheetContainer: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetBackground: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: theme.backgroundBottomsheet,
    },
    handleIndicator: {
      backgroundColor: theme.divider || "#ccc",
    },
    sheetContent: {
      flex: 1,
      borderColor: "black",
      borderWidth: 2,
      margin: 10,
      borderRadius: 15,
    },
    menuRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    menuItem: {
      alignItems: "center",
    },
    menuText: {
      marginTop: 6,
      fontSize: 12,
      color: theme.text,
    },
    floatingMenuContainer: {
      position: "absolute",
      bottom: 70, // above bottom bar
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 1000,
    },
    floatingMenu: {
      backgroundColor: theme.backgroundBottomsheet,
      borderRadius: 15,
      padding: 20,
      alignSelf: "flex-start",
      width: "30%",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    ...(Platform.OS === "web" && {
      list: {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::-webkit-scrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      },
    }),
  });
}
