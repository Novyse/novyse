import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
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
import * as Crypto from "expo-crypto";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import eventEmitter from "./utils/EventEmitter";
import { useRouter } from "expo-router"; // Per la navigazione

const ChatContent = ({ chatId, userId, onBack }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]); // Add a ref to track messages
  const [newMessageText, setNewMessageText] = useState("");
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

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await localDatabase.fetchAllChatMessages(chatId);
        const reversedMsgs = msgs.reverse();
        setMessages(reversedMsgs);
        messagesRef.current = reversedMsgs; // Update ref
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
          message_id: data.message_id,
          sender: data.sender,
          text: data.text,
          date_time: data.date
        };
        
        // Check if message already exists
        //if (!messagesRef.current.some(msg => msg.message_id === newMessage.message_id)) {
          setMessages(currentMessages => {
            const updatedMessages = [newMessage, ...currentMessages];
            messagesRef.current = updatedMessages; // Update ref
            return updatedMessages;
          });
        //}
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

  const generateHash = async (message) => {
    try {
      const saltBytes = await Crypto.getRandomBytesAsync(16);
      const saltHex = Array.from(saltBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const timestamp = Date.now().toString(); // Aggiunge un timestamp per unicità
      const messageBytes = new TextEncoder().encode(`${message}-${timestamp}`);
      const messageWithSalt = new Uint8Array(
        saltBytes.length + messageBytes.length
      );
      messageWithSalt.set(saltBytes);
      messageWithSalt.set(messageBytes, saltBytes.length);
      const hashBytes = await Crypto.digest(
        Crypto.CryptoDigestAlgorithm.SHA256,
        messageWithSalt
      );
      const hash = Array.from(new Uint8Array(hashBytes))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return { hash, saltHex };
    } catch (error) {
      console.error("Error in hash generation:", error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim()) {
      console.warn("Empty message, not sending");
      return;
    }

    try {
      const { hash, saltHex } = await generateHash(newMessageText);

      const newMessage = {
        message_id: Date.now().toString(), // ID univoco basato sul timestamp
        sender: userId,
        text: newMessageText,
        date_time: new Date().toISOString(),
        hash,
        uniqueKey: `msg-${Date.now()}`, // Chiave unica per il FlatList
      };

      

      console.log("Tentativo di salvare e inviare messaggio:", newMessage);

      // Salva nel database locale
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
      data = {chat_id: chatId, text: newMessageText, date: newMessageDate}
      eventEmitter.emit("updateNewLastMessage", data);


      // Invia via WebSocket con retry se necessario
      WebSocketMethods.webSocketSenderMessage(
        JSON.stringify({
          type: "send_message",
          text: newMessageText,
          chat_id: chatId,
          salt: saltHex,
        })
      );
      console.log("Messaggio inviato via WebSocket");

      

      // Aggiorna lo stato locale
      setMessages((currentMessages) => [newMessage, ...currentMessages]);
      setNewMessageText("");
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
    }
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
        // Use message_id directly without wrapping it in another object
        uniqueKey: message.message_id,
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

  const renderMessagesList = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={prepareMessagesWithDateSeparators()}
        keyExtractor={(item) => item.uniqueKey} // Usa uniqueKey per garantire unicità
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
      <TextInput
        style={styles.bottomBarTextInput}
        placeholder="New message"
        placeholderTextColor="gray"
        value={newMessageText}
        maxLength={2000}
        onChangeText={setNewMessageText}
        returnKeyType="send"
        onSubmitEditing={Platform.OS === "web" ? handleSendMessage : undefined}
      />
      <Pressable onPress={handleSendMessage} style={styles.sendButton}>
        <MaterialIcons name="send" size={24} color="#ffffff" />
      </Pressable>
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
      color: theme.text,
      fontSize: 14,
    },
    msgSender: {
      backgroundColor: "#2b5278",
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderTopRightRadius: 3,
      alignSelf: "flex-end",
      alignItems: "flex-end",
    },
    msgReceiver: {
      backgroundColor: "#2b5278",
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderTopLeftRadius: 3,
      alignSelf: "flex-start",
      alignItems: "flex-start",
    },
    listContainer: {
      flex: 1,
    },
    flatList: {
      flex: 1,
      ...(Platform.OS === "web" && {
        scrollbarWidth: "thin", // Firefox
        scrollbarColor: "#000000 transparent", // Firefox: slider nero, sfondo trasparente
        "::-webkit-scrollbar": {
          width: 8,
          backgroundColor: "transparent",
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: "#000000",
          borderRadius: 4,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: "transparent",
        },
      }),
    },
    bottomBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      width: "100%",
      maxWidth: 1024,
      marginHorizontal: "auto",
    },
    bottomBarTextInput: {
      flex: 1,
      borderColor: "white",
      borderWidth: 1,
      borderRadius: 100,
      padding: 10,
      fontSize: 18,
      color: theme.text,
    },
    sendButton: {
      backgroundColor: "#2196F3",
      borderRadius: 100,
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 10,
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