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
  Pressable,
  SafeAreaView,
  StyleSheet,
  FlatList,
  TextInput,
  BackHandler,
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
import chatUtils from "./utils/chat/index";

import auth from "./utils/welcome/auth";
import Database from "./utils/storage/database";
import gateway from "./utils/backend-services/api-gateway";

import eventEmitter from "./utils/global/Events/EventEmitter.js";

// Hooks
import useChatData from "./hooks/useChatData.js";

// Context
import { ChatContext } from "../context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";
import { UserContext } from "@/context/UserContext";

const ChatContent = ({ onBack, contentView }) => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  const styles = createStyle(theme);
  const [newMessageText, setNewMessageText] = useState("");
  const [isVoiceMessage, setVoiceMessage] = useState(true);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isMicClicked, setIsMicClicked] = useState(false);

  const { selectedChatUUID, setSelectedChatUUID, selectedHandle } =
    useContext(ChatContext);
  const { chat, messages, setMessages, loading } = useChatData(
    selectedChatUUID,
    selectedHandle
  );
  const { userUUID: myUUID } = useContext(UserContext);

  const [dropdownInfo, setDropdownInfo] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });
  const [containerLayout, setContainerLayout] = useState({
    width: 0,
    height: 0,
  });
  const containerRef = useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);

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

  // // quando voglio inviare il primo messaggio per avviare una chat
  // const handleNewChatFirstMessage = async (handle) => {
  //   //creo nuova chat
  //   const newChatChatId = await gateway.createNewChatAPI(handle);
  //   console.log("🚨Nuova chat ID: ", newChatChatId);

  //   // inserisco chat e user nel db locale
  //   await localDatabase.insertChat(newChatChatId, "");
  //   await localDatabase.insertChatAndUsers(newChatChatId, handle);
  //   await localDatabase.insertUsers(handle);

  //   router.navigate(`/chat/${newChatChatId}`);

  //   // aggiorno live la lista delle chat
  //   eventEmitter.emit("newChat", { newChatId: newChatChatId });

  //   // Existing message handling logic
  //   const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
  //   const randomNumberPlusDate = Date.now() + randomNumber;

  //   const tempMessage = {
  //     message_id: randomNumberPlusDate,
  //     sender: userId,
  //     text: newMessageText,
  //     date_time: "",
  //     hash: randomNumberPlusDate,
  //   };

  //   setMessages((currentMessages) => [tempMessage, ...currentMessages]);

  //   await JsonParser.sendMessageJson(
  //     newChatChatId,
  //     newMessageText,
  //     randomNumberPlusDate
  //   );
  // };

  // //gestione invio messaggio (quando l'utente preme il pulsante)
  // const handleSendMessage = async () => {
  //   if (!newMessageText.trim()) {
  //     console.warn("Empty message, not sending");
  //     return;
  //   }

  //   try {
  //     if (false) {
  //       // Handle first message in new chat
  //       await handleNewChatFirstMessage(params.creatingChatWith);
  //     } else {
  //       // Existing message handling logic
  //       const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
  //       const randomNumberPlusDate = Date.now() + randomNumber;

  //       const tempMessage = {
  //         message_id: randomNumberPlusDate,
  //         sender: userId,
  //         date_time: "", // Vuoto per mostrare l'orologio
  //         hash: randomNumberPlusDate,
  //         content: { text: newMessageText },
  //       };

  //       setMessages((currentMessages) => [tempMessage, ...currentMessages]);

  //       await JsonParser.sendMessageJson(
  //         chatId,
  //         newMessageText,
  //         randomNumberPlusDate
  //       );
  //     }

  //     // Common cleanup
  //     setNewMessageText("");
  //     setVoiceMessage(true);
  //     setIsMicClicked(false);
  //   } catch (error) {
  //     console.error("Errore nell'invio del messaggio:", error);
  //   }
  // };

  // gestisco quando il microfono viene premuto
  // non ci sono ancora i messaggi vocali, ma intanto l'ho fatto
  const handleVoiceMessage = () => {
    console.log("Voice message button pressed");
    setIsMicClicked(true);
    setVoiceMessage(false);
  };

  // gestisco quando viene premuto il pulsante emoji
  const toggleEmojiPicker = () => {
    setIsEmojiPickerVisible(!isEmojiPickerVisible);
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

  // gestisco quando l'utente tiene premuto su un messaggio nella chat
  const handleLongPress = (event, message) => {
    if (dropdownInfo.visible) {
      setDropdownInfo({ visible: false, x: 0, y: 0, message: null });
    }
    const { pageX, pageY } = event.nativeEvent;
    if (containerRef.current) {
      containerRef.current.measureInWindow((containerX, containerY) => {
        const relativeX = pageX - containerX;
        const relativeY = pageY - containerY;
        setDropdownInfo({
          visible: true,
          x: relativeX,
          y: relativeY,
          message: message,
        });
      });
    }
  };

  const hideDropdown = () => {
    if (dropdownInfo.visible) {
      setDropdownInfo({ visible: false, x: 0, y: 0, message: null });
    }
  };

  const getDropdownStyle = () => {
    const menuWidth = 200;
    const menuHeight = 170;
    let x = dropdownInfo.x;
    let y = dropdownInfo.y;

    if (containerLayout.width && containerLayout.height) {
      if (x + menuWidth > containerLayout.width) {
        x = containerLayout.width - menuWidth;
      }
      if (y + menuHeight > containerLayout.height) {
        y = containerLayout.height - menuHeight;
      }
      if (x < 0) x = 0;
      if (y < 0) y = 0;
    }
    return {
      position: "absolute",
      left: x - 10,
      top: y - 10,
      width: menuWidth,
      height: menuHeight,
      backgroundColor: theme.backgroundModal,
      borderColor: theme.borderModal,
      borderWidth: 1,
      borderRadius: 5,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    };
  };

  const handleSendMessage = async () => {
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
    // Messaggio temporaneo da storare nel database, da aggiungere a messages e poi da cambiare con quello che arriva dall'api
    // @Matt3opower
    // const messageID = Date.now().toString();
    // const tempMessage = {
    //   id: messageID,
    //   chatUUID: chat.uuid,
    //   senderUUID: myUUID,
    //   text: newMessageText,
    //   created_at: "",
    //   type: "text",
    // };
    // await database.addMessage(message);
    // poi si deve fare un metodo per sostituire il messaggio temporaneo con quello vero

    const { success, message } = await gateway.message.send(
      currentChatUUID,
      newMessageText,
      "text"
    );
    if (success) {
      console.log("Message sent successfully:", message);
      // mando event emitter
      await eventEmitter.newMessage(message);
      // Aggiungo il messaggio alla lista dei messaggi
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

    // Ordina i messaggi per date_time in ordine decrescente (più recenti prima)
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
        // Aggiungi il gruppo precedente e il suo separatore (se esiste)
        if (groupMessages.length > 0) {
          prepared.push(...groupMessages);
          prepared.push({
            type: "separator",
            data: lastDateDisplay,
            uniqueKey: `separator-${lastDate}`,
          });
        }
        // Inizia un nuovo gruppo
        groupMessages = [];
        lastDate = messageDate;
        lastDateDisplay = displayDate;
      }

      // Aggiungi il messaggio al gruppo corrente
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

    // Aggiungi l'ultimo gruppo e il suo separatore
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

  //gestisco quando il testo cmbia nel textinput
  const handleTextChanging = (text) => {
    setNewMessageText(text);
    setVoiceMessage(text.length === 0 && !isMicClicked);
  };

  // // gestisco quando clicco il pulsante per joinare un gruppo
  // const handleJoinGroup = async () => {
  //   const joinGroup = await gateway.joinGroup(params.creatingChatWith);

  //   if (joinGroup.group_joined) {
  //     await localDatabase.insertChat(joinGroup.chat_id, joinGroup.group_name);

  //     for (const member of joinGroup.members) {
  //       await localDatabase.insertChatAndUsers(
  //         joinGroup.chat_id,
  //         member.handle
  //       );
  //       await localDatabase.insertUsers(member.handle);
  //     }

  //     if (joinGroup.messages == null) {
  //       console.log("Messaggi nel gruppo vuoti");
  //     } else {
  //       for (const message of joinGroup.messages) {
  //         await localDatabase.insertMessage(
  //           message.message_id,
  //           joinGroup.chat_id,
  //           message.text,
  //           message.sender,
  //           message.date,
  //           ""
  //         );
  //       }
  //     }

  //     if (onJoinSuccess) {
  //       onJoinSuccess(joinGroup.chat_id); // Passa il nuovo chat_id al genitore
  //     }

  //     router.navigate(`/chat/${joinGroup.chat_id}`);

  //     // aggiorno live la lista delle chat
  //     eventEmitter.emit("newChat", { newChatId: joinGroup.chat_id });
  //   }
  // };

  const renderMessagesList = () => {
    return (
      <View style={styles.listContainer}>
        {(!loading && (
          <FlatList
            data={prepareMessages(messages)}
            keyExtractor={(item) => item.uniqueKey}
            renderItem={({ item }) => {
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
                    onLongPress={(e) => handleLongPress(e, message)}
                  />
                );
              }
            }}
            inverted
            style={styles.flatList}
            showsVerticalScrollIndicator={true}
            scrollIndicatorInsets={{ right: 1 }}
          />
        )) ||
          null}
      </View>
    );
  };

  const renderBottomBar = () => {
    return (
      <View
        style={styles.bottomBarContainer}
        onLayout={(event) => {
          setBottomBarHeight(event.nativeEvent.layout.height);
        }}
      >
        {chat.uuid ||
        (chat.type != "GROUP" &&
          chat.type != "CHANNEL" &&
          chat.type != "FORUM") ? (
          <View style={styles.messageBottomContainer}>
            <Icon
              name="PlusSignIcon"
              style={styles.iconButton}
              onPress={() => {}}
            />
            <LinearGradient
              colors={theme.backgroundChatTextInputGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bottomTextBarContainer}
            >
              <TextInput
                style={styles.bottomBarTextInput}
                placeholder={"New message"}
                placeholderTextColor={theme.placeholderText}
                value={newMessageText}
                maxLength={2000}
                onChangeText={handleTextChanging}
                returnKeyType="send"
                onSubmitEditing={
                  Platform.OS === "web" ? handleSendMessage : undefined
                }
              />
              <Icon
                name="SmileIcon"
                style={styles.iconButton}
                onPress={toggleEmojiPicker}
              />
            </LinearGradient>
            {isVoiceMessage ? (
              <Icon
                name="Mic02Icon"
                onPress={handleVoiceMessage}
                style={styles.iconButton}
              />
            ) : (
              <Icon
                name="SentIcon"
                onPress={handleSendMessage}
                style={styles.iconButton}
              />
            )}
          </View>
        ) : (
          <Pressable onPress={handleJoin} style={styles.joinGroupButton}>
            <Text style={styles.joinGroupButtonText}>
              Join{" "}
              {chat.type.charAt(0).toUpperCase() +
                chat.type.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };
  return (
    <SmartBackground
      backgroundKey="backgroundChatContentGradient"
      style={styles.container}
    >
      <SafeAreaView
        ref={containerRef}
        style={styles.safeAreaContainer}
        onStartShouldSetResponder={() => true}
        onResponderRelease={hideDropdown}
        onLayout={(event) => {
          setContainerLayout({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          });
        }}
      >
        {renderMessagesList()}
        <ChatIconsPickerModal
          visible={isEmojiPickerVisible}
          anchor={{ height: bottomBarHeight }}
          onEmojiSelected={handleEmojiSelected}
        >
          <View style={styles.emojiPickerContainer}>
            <Text style={styles.placeholderText}>Emoji Picker Content</Text>
          </View>
        </ChatIconsPickerModal>
        {renderBottomBar()}
        {dropdownInfo.visible && (
          <View style={getDropdownStyle()}>
            <Text style={{ color: theme.text }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.text }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.text }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.text }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.text }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.text }}>
              Informazioni sul messaggio
            </Text>
          </View>
        )}
      </SafeAreaView>
    </SmartBackground>
  );
};

export default ChatContent;

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    safeAreaContainer: {
      flex: 1,
    },
    listContainer: {
      flex: 1,
    },
    flatList: {
      flex: 1,
      // position: "relative",
      ...(Platform.OS === "web" && {
        // Standard per Firefox (fisso, no active/drag change)
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
      }),
    },
    bottomBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      paddingVertical: 10,
      maxHeight: 70,
    },
    bottomTextBarContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 15,
      padding: 8,
    },
    bottomBarTextInput: {
      flex: 1,
      fontSize: 18,
      minWidth: 20,
      color: theme.text,
      placeholderTextColor: theme.placeholderText,
      outlineStyle: "none",
      maxHeight: 45,
    },
    messageBottomContainer: {
      flexDirection: "row",
      width: "100%",
      alignItems: "center",
    },
    iconButton: {
      backgroundColor: "transparent",
      borderRadius: 100,
      width: 35,
      height: 35,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 5,
    },
    joinGroupButton: {
      backgroundColor: theme.backgroundJoinChatButton,
      paddingHorizontal: 30,
      minHeight: 45,
      padding: 13,
      borderRadius: 25,
      alignSelf: "center",
      justifyContent: "center",
      alignItems: "center",
    },
    joinGroupButtonText: {
      fontSize: 18,
      textAlign: "center",
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
  });
}
