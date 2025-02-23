import React, { useState, useEffect, useContext, useRef } from "react";
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

const ChatContent = ({ chatId, userId, lastMessage, dateTime, onBack }) => {
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  const [messages, setMessages] = useState([]);
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

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await localDatabase.fetchAllChatMessages(chatId);
        setMessages(msgs.reverse());
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
      }
    };
    loadMessages();
  }, [chatId]);

  useEffect(() => {
    const handleReceiveMessage = eventEmitter.on("newMessage", (data) => {
      const newMessage = {
        message_id: data.message_id,
        sender: data.sender,
        text: data.text,
        date_time: data.date,
      };
      setMessages((currentMessages) => [newMessage, ...currentMessages]);
    });

    const handleUpdateMessage = eventEmitter.on("updateMessage", (data) => {
      localDatabase.fetchLastMessage(chatId);
      setMessages((currentMessages) =>
        currentMessages.map((item) => {
          if (item.message_id === data.message_id || item.hash === data.hash) {
            return { ...item, date_time: data.date };
          }
          return item;
        })
      );
    });

    const backAction = () => {
      onBack();
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
  }, []);

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
      const messageBytes = new TextEncoder().encode(message);
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

  const addNewMessage = async () => {
    if (newMessageText.trim()) {
      try {
        const { hash: hashedMessage, saltHex: salt } = await generateHash(
          newMessageText
        );
        const newMessage = {
          sender: userId,
          text: newMessageText,
          date_time: "",
          hash: hashedMessage,
        };
        await localDatabase.insertMessage(
          "",
          chatId,
          newMessageText,
          userId,
          "",
          hashedMessage
        );
        WebSocketMethods.webSocketSenderMessage(
          JSON.stringify({
            type: "send_message",
            text: newMessageText,
            chat_id: chatId,
            salt: salt,
          })
        );
        setMessages((currentMessages) => [newMessage, ...currentMessages]);
        setNewMessageText("");
      } catch (error) {
        console.error("Error adding new message:", error);
      }
    } else {
      console.warn("Empty message, not sending");
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

  // Funzione per raggruppare i messaggi e inserire separatori di data, adattata per inverted
  const prepareMessagesWithDateSeparators = () => {
    const groupedMessages = [];
    let currentDayMessages = [];
    let lastDate = null;

    // Se non ci sono messaggi, restituiamo un array vuoto
    if (messages.length === 0) return groupedMessages;

    // Iteriamo sui messaggi
    messages.forEach((message) => {
      const messageDate = moment(message.date_time || new Date()).format(
        "DD-MM-YYYY"
      );

      // Se la data cambia o è il primo messaggio dopo un gruppo, aggiungiamo il separatore
      if (lastDate && lastDate !== messageDate) {
        // Aggiungiamo tutti i messaggi accumulati del giorno precedente
        groupedMessages.push(...currentDayMessages);
        // Aggiungiamo il separatore della data del giorno precedente
        groupedMessages.push({
          type: "date_separator",
          date: lastDate,
        });
        // Resettiamo l'array per il nuovo giorno
        currentDayMessages = [];
      }

      // Aggiungiamo il messaggio corrente al gruppo del giorno
      currentDayMessages.push({
        type: "message",
        data: message,
      });
      lastDate = messageDate;
    });

    // Dopo l'ultimo gruppo di messaggi, aggiungiamo i messaggi rimanenti e il separatore
    if (currentDayMessages.length > 0) {
      groupedMessages.push(...currentDayMessages);
      groupedMessages.push({
        type: "date_separator",
        date: lastDate,
      });
    }

    return groupedMessages;
  };

  const renderMessagesList = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={prepareMessagesWithDateSeparators()}
        keyExtractor={(item, index) =>
          item.type === "message"
            ? item.data.message_id || item.data.hash
            : `date_${index}`
        }
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
                onPress={(e) => handleLongPress(e, message)}
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
        onSubmitEditing={Platform.OS === "web" ? addNewMessage : undefined}
      />
      <Pressable onPress={addNewMessage} style={styles.sendButton}>
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

function createStyle(theme, colorScheme) {
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
      borderTopRightRadius: 0,
      alignSelf: "flex-end",
      alignItems: "flex-end",
    },
    msgReceiver: {
      backgroundColor: "#2b5278",
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderTopLeftRadius: 0,
      alignSelf: "flex-start",
      alignItems: "flex-start",
    },
    listContainer: {
      flex: 1,
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
      backgroundColor: "#ffffff",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      marginVertical: 10,
    },
    dateSeparatorText: {
      color: "#000",
      fontSize: 14,
      fontWeight: "bold",
    },
  });
}
