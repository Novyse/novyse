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
import { ThemeContext } from "@/context/ThemeContext";
import localDatabase from "./utils/localDatabaseMethods";
import moment from "moment";
import eventEmitter from "./utils/EventEmitter";
import { useRouter, useLocalSearchParams } from "expo-router";
import "react-native-get-random-values";
import JsonParser from "./utils/JsonParser";
import gateway from "./utils/backend-services/api-gateway";
import Icon from "./components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import SmartBackground from "./components/SmartBackground";
import ChatIconsPickerModal from "./components/ChatIconsPickerModal";
import MessageBase from "./components/messages/MessageBase";
import MessageSystem from "./components/messages/MessageSystem";

const ChatContent = ({ chatUUID, chatName, messages, onBack, contentView }) => {
  const messagesRef = useRef([]);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [newMessageText, setNewMessageText] = useState("");
  const [isVoiceMessage, setVoiceMessage] = useState(true);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);

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
  const router = useRouter();
  const [isMicClicked, setIsMicClicked] = useState(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const urlRegex =
    /(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])(\S*)/g; //PERFETTO

  useEffect(() => {
    // carico i messaggi quando apro la pagina
    const loadMessages = async () => {
      try {
        messagesRef.current = messages.reverse();
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
        messagesRef.current = [];
      }
    };
    loadMessages();

    setNewMessageText("");

    // // gestisco quando ricevo un messaggio da un utente
    // const handleReceiveMessage = (data) => {
    //   if (data.chat_id === chatId) {
    //     // --- MODIFICA: Creiamo il messaggio con la nuova struttura ---
    //     const newMessage = {
    //       message_id: data.message_id || data.hash,
    //       sender: data.sender,
    //       date_time: data.date,
    //       hash: data.hash,
    //       content: { text: data.text },
    //     };
    //     setMessages((currentMessages) => [newMessage, ...currentMessages]);
    //   }
    // };
    // eventEmitter.on("newMessage", handleReceiveMessage);

    // // gestisco quando il server ritorna le info del messaggio (il server conferma che ha ricevuto il messaggio)
    // const handleUpdateMessage = (data) => {
    //   setMessages((currentMessages) => {
    //     return currentMessages.map((item) => {
    //       if (item.hash === data.hash) {
    //         // --- MODIFICA: Aggiorniamo il messaggio con la nuova struttura ---
    //         return {
    //           message_id: data.message_id,
    //           sender: data.sender,
    //           date_time: data.date,
    //           hash: data.hash,
    //           content: { text: data.text },
    //         };
    //       }
    //       return item;
    //     });
    //   });
    // };
    // eventEmitter.on("updateMessage", handleUpdateMessage);

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
      // eventEmitter.off("newMessage", handleReceiveMessage);
      // eventEmitter.off("updateMessage", handleUpdateMessage);
      backHandler.remove();
    };
  }, [chatUUID, onBack]);


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
      backgroundColor: theme.modalBackground,
      borderColor: theme.modalBorder,
      borderWidth: 1,
      borderRadius: 5,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    };
  };

  // preparo i messaggi prima che vengano stampati --> aggiungo le date tra messaggi di giorni diversi
  const prepareMessages = useCallback((messages) => {
    const prepared = [];
    let currentGroup = [];
    let lastKey = null;

    console.log("Preparing messages:", messages);

    if (messages.length === 0) return prepared;

    messages.forEach((message) => {
      const key = moment(message.created_at);

      if (lastKey && lastKey !== key) {
        prepared.push(...currentGroup);
        prepared.push({
          type: "separator",
          data: lastKey,
          uniqueKey: `separator-${lastKey}`,
        });
        currentGroup = [];
      }

      currentGroup.push({
        type: "message",
        data: message,
        uniqueKey: message.hash || message.message_id, // Usa l'hash come uniqueKey
      });
      lastKey = key;
    });

    if (currentGroup.length > 0) {
      prepared.push(...currentGroup);
      if (lastKey) {
        prepared.push({
          type: "separator",
          data: lastKey,
          uniqueKey: `separator-${lastKey}`,
        });
      }
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

  const renderMessagesList = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={prepareMessages(messages)}
        keyExtractor={(item) => item.uniqueKey}
        renderItem={({ item }) => {
          if (item.type === "separator") {
            return <MessageSystem type={"date"} data={item.data} />; // oppure tipo type={item.systemType}
          } else {
            const message = item.data;
            return (
              <MessageBase
                message={message}
                isSender={message.sender === userId}
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
    </View>
  );

  const renderBottomBar = () => {
    console.log(
      "Rendering bottom bar with contentView:",
      contentView
    );
    return (
      <View
        style={styles.bottomBarContainer}
        onLayout={(event) => {
          setBottomBarHeight(event.nativeEvent.layout.height);
        }}
      >
        {contentView === "both" ? (
          <View
            style={{
              paddingBottom: 10,
              flexDirection: "row",
              width: "100%",
              alignItems: "center",
            }}
          >
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
                placeholder="New message"
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
          // <Pressable onPress={handleJoinGroup} style={styles.joinGroupButton}>
          //   <Text style={styles.joinGroupButtonText}>Join</Text>
          // </Pressable>
          <Text style={styles.joinGroupButtonText}>Lascia stare per ora</Text>
        )}
      </View>
    );
  };
  return (
    <SmartBackground
      backgroundKey="backgroundChatGradient"
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
            <Text style={{ color: theme.modalText }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.modalText }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.modalText }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.modalText }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.modalText }}>
              Informazioni sul messaggio
            </Text>
            <Text style={{ color: theme.modalText }}>
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
    MessageTextContent: {
      color: theme.text,
      fontSize: 18,
      maxWidth: "100%",
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
      }),
    },
    timeText: {
      color: theme.textTime,
      fontSize: 12,
      marginLeft: 4,
      alignSelf: "flex-end",
      minWidth: 35,
      textAlign: "right",
    },
    msgSender: {
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderBottomRightRadius: 0,
      alignSelf: "flex-end",
      marginRight: 8,
    },
    msgReceiver: {
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderBottomLeftRadius: 0,
      alignSelf: "flex-start",
      marginLeft: 8,
    },
    messagePressable: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      gap: 4,
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }),
    },
    listContainer: {
      flex: 1,
    },
    flatList: {
      flex: 1,
      position: "relative",
      ...(Platform.OS === "web" && {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.icon} transparent`,
        "::-webkit-scrollbar": {
          width: 8,
          backgroundColor: "transparent",
          position: "absolute",
          right: 0,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.icon,
          borderRadius: 4,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: "transparent",
          position: "absolute",
          right: 0,
        },
      }),
    },
    bottomBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      width: "100%",
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
      backgroundColor: theme.joinGroupButtonBackground,
      width: "100%",
      height: "100%",
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.chatDivider,
    },
    joinGroupButtonText: {
      fontSize: 18,
      textAlign: "center",
      color: theme.text,
      fontWeight: "bold",
    },
    messagesLink: {
      fontSize: 18,
      color: theme.messagesLink,
      textDecorationLine: "underline",
      ...(Platform.OS === "web" && {
        wordBreak: "break-all",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
        maxWidth: "100%",
      }),
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
