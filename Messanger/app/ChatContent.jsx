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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import eventEmitter from "./utils/EventEmitter";
import { useRouter, useLocalSearchParams } from "expo-router";
import "react-native-get-random-values";
import JsonParser from "./utils/JsonParser";
import APIMethods from "./utils/APImethods";

const ChatContent = ({ chatJoined, chatId, userId, onBack, onJoinSuccess }) => {
  const messagesRef = useRef([]);
  const [messages, setMessages] = useState([]);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [newMessageText, setNewMessageText] = useState("");
  const [isVoiceMessage, setVoiceMessage] = useState(true);

  const params = useLocalSearchParams();

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

  useEffect(() => {
    // carico i messaggi quando apro la pagina
    const loadMessages = async () => {
      try {
        const msgs = await localDatabase.fetchAllChatMessages(chatId);
        const reversedMsgs = msgs.reverse();
        setMessages(reversedMsgs);
        messagesRef.current = reversedMsgs;
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
        messagesRef.current = [];
      }
    };
    loadMessages();

    setNewMessageText("");

    // gestisco quando ricevo un messaggio da un utente
    const handleReceiveMessage = (data) => {
      if (data.chat_id === chatId) {
        const newMessage = {
          message_id: data.message_id || data.hash, // Nota: l'hash non è più usato, al suo posto ci va un numero random
          sender: data.sender,
          text: data.text,
          date_time: data.date,
          hash: data.hash,
        };

        setMessages((currentMessages) => {
          const updatedMessages = [newMessage, ...currentMessages];
          messagesRef.current = updatedMessages;
          return updatedMessages;
        });
      }
    };
    eventEmitter.on("newMessage", handleReceiveMessage);

    // gestisco quando il server ritorna le info del messaggio (il server conferma che ha ricevuto il messaggio)
    const handleUpdateMessage = (data) => {
      setMessages((currentMessages) => {
        return currentMessages.map((item) => {
          // Check if this is our temporary message that needs updating
          if (item.hash === data.hash) {
            return {
              message_id: data.message_id,
              sender: data.sender,
              text: data.text,
              date_time: data.date,
              hash: data.hash,
            };
          }
          return item;
        });
      });
    };
    eventEmitter.on("updateMessage", handleUpdateMessage);

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
      eventEmitter.off("newMessage", handleReceiveMessage);
      eventEmitter.off("updateMessage", handleUpdateMessage);
      backHandler.remove();
    };
  }, [chatId, onBack]);

  // trasforma la data in un formato HH:MM
  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) return "";
    const timeMoment = moment(dateTimeMessage);
    return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
  };

  // quando voglio inviare il primo messaggio per avviare una chat
  const handleNewChatFirstMessage = async (handle) => {
    //creo nuova chat
    const newChatChatId = await APIMethods.createNewChatAPI(handle);
    console.log("🚨Nuova chat ID: ", newChatChatId);

    // inserisco chat e user nel db locale
    await localDatabase.insertChat(newChatChatId, "");
    await localDatabase.insertChatAndUsers(newChatChatId, handle);
    await localDatabase.insertUsers(handle);

    router.navigate(`/messages?chatId=${newChatChatId}`);

    // aggiorno live la lista delle chat
    eventEmitter.emit("newChat", { newChatId: newChatChatId });

    // Existing message handling logic
    const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
    const randomNumberPlusDate = Date.now() + randomNumber;

    const tempMessage = {
      message_id: randomNumberPlusDate,
      sender: userId,
      text: newMessageText,
      date_time: "",
      hash: randomNumberPlusDate,
    };

    setMessages((currentMessages) => [tempMessage, ...currentMessages]);
    await JsonParser.sendMessageJson(
      newChatChatId,
      newMessageText,
      randomNumberPlusDate
    );
  };

  //gestione invio messaggio (quando l'utente preme il pulsante)
  const handleSendMessage = async () => {
    if (!newMessageText.trim()) {
      console.warn("Empty message, not sending");
      return;
    }

    try {
      if (
        params.creatingChatWith !== null &&
        params.creatingChatWith !== undefined
      ) {
        // Handle first message in new chat
        await handleNewChatFirstMessage(params.creatingChatWith);
      } else {
        // Existing message handling logic
        const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
        const randomNumberPlusDate = Date.now() + randomNumber;

        const tempMessage = {
          message_id: randomNumberPlusDate,
          sender: userId,
          text: newMessageText,
          date_time: "",
          hash: randomNumberPlusDate,
        };

        setMessages((currentMessages) => [tempMessage, ...currentMessages]);
        await JsonParser.sendMessageJson(
          chatId,
          newMessageText,
          randomNumberPlusDate
        );
      }

      // Common cleanup
      setNewMessageText("");
      setVoiceMessage(true);
      setIsMicClicked(false);
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
    }
  };

  // gestisco quando il microfono viene premuto
  // non ci sono ancora i messaggi vocali, ma intanto l'ho fatto
  const handleVoiceMessage = () => {
    console.log("Voice message button pressed");
    setIsMicClicked(true);
    setVoiceMessage(false);
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
      left: x,
      top: y,
      width: menuWidth,
      height: menuHeight,
      backgroundColor: "#ffffff",
      borderColor: "#000",
      borderWidth: 1,
      borderRadius: 5,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    };
  };

  // preparo i messaggi prima che vengano stampati --> aggiungo le date tra messaggi di giorni diversi
  const prepareMessagesWithDateSeparators = useCallback(() => {
    const groupedMessages = [];
    let currentDayMessages = [];
    let lastDate = null;

    if (messages.length === 0) return groupedMessages;

    messages.forEach((message) => {
      const messageDate = moment(message.date_time || new Date()).format(
        "DD-MM-YYYY"
      );

      if (lastDate && lastDate !== messageDate) {
        groupedMessages.push(...currentDayMessages);
        groupedMessages.push({
          type: "date_separator",
          date: lastDate,
          uniqueKey: `date-${lastDate}`,
        });
        currentDayMessages = [];
      }

      currentDayMessages.push({
        type: "message",
        data: message,
        uniqueKey: message.hash || message.message_id, // Usa l'hash come uniqueKey
      });
      lastDate = messageDate;
    });

    if (currentDayMessages.length > 0) {
      groupedMessages.push(...currentDayMessages);
      if (lastDate) {
        groupedMessages.push({
          type: "date_separator",
          date: lastDate,
          uniqueKey: `date-${lastDate}`,
        });
      }
    }

    return groupedMessages;
  }, [messages]);

  //gestisco quando il testo cmbia nel textinput
  const handleTextChanging = (text) => {
    setNewMessageText(text);
    setVoiceMessage(text.length === 0 && !isMicClicked);
  };

  // gestisco quando clicco il pulsante per joinare un gruppo
  const handleJoinGroup = async () => {
    const joinGroup = await APIMethods.joinGroup(params.creatingChatWith);

    if (joinGroup.group_joined) {
      await localDatabase.insertChat(joinGroup.chat_id, joinGroup.group_name);

      // da capire se usare uno useState in qualche modo
      chatJoined = true;

      for (const member of joinGroup.members) {
        await localDatabase.insertChatAndUsers(
          joinGroup.chat_id,
          member.handle
        );
        await localDatabase.insertUsers(member.handle);
      }

      if (joinGroup.messages == null) {
        console.log("Messaggi nel gruppo vuoti");
      } else {
        for (const message of joinGroup.messages) {
          await localDatabase.insertMessage(
            message.message_id,
            joinGroup.chat_id,
            message.text,
            message.sender,
            message.date,
            ""
          );
        }
      }

      if (onJoinSuccess) {
        onJoinSuccess(joinGroup.chat_id); // Passa il nuovo chat_id al genitore
      }

      router.navigate(`/messages?chatId=${joinGroup.chat_id}`);

      // aggiorno live la lista delle chat
      eventEmitter.emit("newChat", { newChatId: joinGroup.chat_id });
    }
  };

  const renderMessagesList = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={prepareMessagesWithDateSeparators()}
        keyExtractor={(item) => item.uniqueKey}
        renderItem={({ item }) => {
          if (item.type === "date_separator") {
            return (
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{item.date}</Text>
              </View>
            );
          } else {
            const message = item.data;
            return (
              <Pressable
                onLongPress={(e) => handleLongPress(e, message)}
                style={
                  message.sender == userId
                    ? styles.msgSender
                    : styles.msgReceiver
                }
              >
                <Text style={styles.textMessageContent}>{message.text}</Text>
                <Text style={styles.timeText}>
                  {message.date_time === "" ? (
                    <MaterialIcons
                      name="access-time"
                      size={14}
                      color="#ffffff"
                    />
                  ) : (
                    parseTime(message.date_time)
                  )}
                </Text>
              </Pressable>
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

  const renderBottomBar = () => (
    <View style={styles.bottomBarContainer}>
      {chatJoined ? (
        <View
          style={{
            paddingBottom: 10,
            flexDirection: "row",
            width: "100%",
            alignItems: "center",
          }}
        >
          <Pressable style={styles.iconButton}>
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          </Pressable>
          <View style={styles.bottomTextBarContainer}>
            <TextInput
              style={styles.bottomBarTextInput}
              placeholder="New message"
              placeholderTextColor="gray"
              value={newMessageText}
              maxLength={2000}
              onChangeText={handleTextChanging}
              returnKeyType="send"
              onSubmitEditing={
                Platform.OS === "web" ? handleSendMessage : undefined
              }
            />
            <Pressable style={styles.iconButton}>
              <FontAwesome6 name="face-smile" size={24} color="#fff" />
            </Pressable>
          </View>

          {isVoiceMessage ? (
            <Pressable onPress={handleVoiceMessage} style={styles.iconButton}>
              <MaterialCommunityIcons
                name="microphone"
                size={24}
                color="#fff"
              />
            </Pressable>
          ) : (
            <Pressable onPress={handleSendMessage} style={styles.iconButton}>
              <MaterialIcons name="arrow-upward" size={24} color="#fff" />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable onPress={handleJoinGroup} style={styles.joinGroupButton}>
          <Text style={styles.joinGroupButtonText}>Join</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView
      ref={containerRef}
      style={styles.container}
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
      {renderBottomBar()}
      {dropdownInfo.visible && (
        <View style={getDropdownStyle()}>
          <Text style={{ color: "#000" }}>Informazioni sul messaggio</Text>
          <Text style={{ color: "#000" }}>Informazioni sul messaggio</Text>
          <Text style={{ color: "#000" }}>Informazioni sul messaggio</Text>
          <Text style={{ color: "#000" }}>Informazioni sul messaggio</Text>
          <Text style={{ color: "#000" }}>Informazioni sul messaggio</Text>
          <Text style={{ color: "#000" }}>Informazioni sul messaggio</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ChatContent;

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundChat,
    },
    textMessageContent: {
      color: theme.text,
      fontSize: 18,
      maxWidth: "100%",
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
      backgroundColor: "#2b5278",
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderBottomRightRadius: 0,
      alignSelf: "flex-end",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      gap: 4,
      marginRight: 8,
    },
    msgReceiver: {
      backgroundColor: "#2b5278",
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderBottomLeftRadius: 0,
      alignSelf: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      gap: 4,
      marginLeft: 8,
    },
    listContainer: {
      flex: 1,
    },
    flatList: {
      flex: 1,
      position: "relative",
      ...(Platform.OS === "web" && {
        scrollbarWidth: "thin",
        scrollbarColor: "#000000 transparent",
        "::-webkit-scrollbar": {
          width: 8,
          backgroundColor: "transparent",
          position: "absolute",
          right: 0,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: "#000000",
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
      backgroundColor: theme.backgroundChatTextInput,
      borderRadius: 15,
      padding: 8,
    },
    bottomBarTextInput: {
      flex: 1,
      // backgroundColor: theme.backgroundChatTextInput,
      // borderRadius: 15,

      fontSize: 18,
      minWidth: 20,
      color: theme.text,
      placeholderTextColor: "#bfbfbf",
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
    dateSeparator: {
      alignSelf: "center",
      backgroundColor: "#17212b",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      marginVertical: 10,
    },
    dateSeparatorText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
    },
    joinGroupButton: {
      backgroundColor: "#1b2734",
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
  });
}
