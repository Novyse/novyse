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
import WebSocketMethods from "./utils/webSocketMethods";
import moment from "moment";
// import * as Crypto from "expo-crypto";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import eventEmitter from "./utils/EventEmitter";
import { useRouter } from "expo-router";
import 'react-native-get-random-values';
import crypto from 'react-native-crypto';

const ChatContent = ({ chatId, userId, onBack }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isVoiceMessage, setVoiceMessage] = useState(true);
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
  }, [chatId]);

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      if (data.chat_id === chatId) {
        const newMessage = {
          message_id: data.message_id || data.hash, // Usa l'hash se disponibile
          sender: data.sender,
          text: data.text,
          date_time: data.date,
          hash: data.hash, // Assumi che il server restituisca l'hash
        };

        setMessages((currentMessages) => {
          const updatedMessages = [newMessage, ...currentMessages];
          messagesRef.current = updatedMessages;
          return updatedMessages;
        });
      }
    };

    eventEmitter.on("newMessage", handleReceiveMessage);

    return () => {
      eventEmitter.off("newMessage", handleReceiveMessage);
    };
  }, [chatId]);

  useEffect(() => {
    const handleUpdateMessage = eventEmitter.on("updateMessage", (data) => {
      setMessages((currentMessages) =>
        currentMessages.map((item) => {
          if (item.message_id === data.message_id) {
            return { ...item, date_time: data.date };
          }
          return item;
        })
      );
    });

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
      eventEmitter.off("updateMessage", handleUpdateMessage);
      backHandler.remove();
    };
  }, [chatId, onBack]);

  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) return "";
    const timeMoment = moment(dateTimeMessage);
    return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
  };

  //funzione per generare hash messaggio da inviare
  const generateHash = async (digest) => {
    try {
      const saltBytes = crypto.randomBytes(16);
      const saltHex = saltBytes.toString('hex');
  
      // Convert the digest to a Buffer
      const digestBytes = Buffer.from(digest, 'utf-8');
  
      // Concatenate the salt and digest
      const saltedDigest = Buffer.concat([saltBytes, digestBytes]);
  
      // Create a SHA-256 hash
      const hash = crypto.createHash('sha256');
  
      // Update the hash with the salted digest
      hash.update(saltedDigest);
      const hashHex = hash.digest('hex');
  
      return { hashHex, salt: saltHex };
    } catch (error) {
      console.error('Error in hash generation:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim()) {
      console.warn("Empty message, not sending");
      return;
    }

    try {
      const { saltHex, hash } = await generateHash(newMessageText);

      const newMessage = {
        message_id: hash, // Usa l'hash come message_id
        sender: userId,
        text: newMessageText,
        date_time: "",
        hash, // Salva l'hash nel messaggio
      };

      console.log("Tentativo di salvare e inviare messaggio:", newMessage);

      await localDatabase.insertMessage(
        "",
        chatId,
        newMessageText,
        userId,
        newMessage.date_time,
        hash
      );
      console.log("Messaggio salvato nel database locale");

      const newMessageDate = newMessage.date_time;
      const data = {
        chat_id: chatId,
        text: newMessageText,
        date: newMessageDate,
      };
      eventEmitter.emit("updateNewLastMessage", data);

      WebSocketMethods.sendNewMessage({
        text: newMessageText,
        chat_id: chatId,
        salt: saltHex,
      });
      console.log("Messaggio inviato via WebSocket");

      setMessages((currentMessages) => [newMessage, ...currentMessages]);
      setNewMessageText("");
      setVoiceMessage(true);
      setIsMicClicked(false);
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
    }
  };

  const handleVoiceMessage = () => {
    console.log("Voice message button pressed");
    setIsMicClicked(true);
    setVoiceMessage(false);
  };

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

  const handleTextChanging = (text) => {
    setNewMessageText(text);
    setVoiceMessage(text.length === 0 && !isMicClicked);
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
                  message.sender === userId
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
          <MaterialCommunityIcons name="microphone" size={24} color="#fff" />
        </Pressable>
      ) : (
        <Pressable onPress={handleSendMessage} style={styles.iconButton}>
          <MaterialIcons name="arrow-upward" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );

  const getDropdownStyle = () => {
    const menuWidth = 200;
    const menuHeight = 50;
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
  });
}
