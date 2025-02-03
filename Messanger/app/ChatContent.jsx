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

  // Stato per il menu a tendina (dropdown)
  const [dropdownInfo, setDropdownInfo] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });
  // Stato per misurare la dimensione del container (width e height)
  const [containerLayout, setContainerLayout] = useState({
    width: 0,
    height: 0,
  });
  // Riferimento al container per misurare la sua posizione assoluta
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
            console.log("Updating message:", item);
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

  // NON TOCCARE QUESTO METODO, GRAZIE
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
      console.log("HashBytes generato:", hashBytes);
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

  // Funzione per gestire il long press su un messaggio
  const handleLongPress = (event, message) => {
    // Nasconde eventuali dropdown già visibili
    if (dropdownInfo.visible) {
      setDropdownInfo({ visible: false, x: 0, y: 0, message: null });
    }
    const { pageX, pageY } = event.nativeEvent;
    // Misuriamo la posizione assoluta del container
    if (containerRef.current) {
      containerRef.current.measureInWindow((containerX, containerY) => {
        // Calcola le coordinate relative al container
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

  // Nasconde il dropdown se si tocca altrove
  const hideDropdown = () => {
    if (dropdownInfo.visible) {
      setDropdownInfo({ visible: false, x: 0, y: 0, message: null });
    }
  };

  const renderMessagesList = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.message_id || item.hash}
        renderItem={({ item }) => (
          <Pressable
            onPress={(e) => handleLongPress(e, item)}
            // onPress={hideDropdown}
            style={
              item.sender === userId ? styles.msgSender : styles.msgReceiver
            }
          >
            <Text style={styles.textMessageContent}>{item.text}</Text>
            <Text style={styles.timeText}>
              {item.date_time === "" ? (
                <MaterialIcons name="access-time" size={14} color="#ffffff" />
              ) : (
                parseTime(item.date_time)
              )}
            </Text>
          </Pressable>
        )}
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

  // Calcola la posizione del dropdown in modo che non esca fuori dal container
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
      // Rende il container un responder in modo da intercettare i tocchi su zone vuote
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
  });
}
