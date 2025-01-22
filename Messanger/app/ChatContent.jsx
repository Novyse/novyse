import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import localDatabase from "./utils/localDatabaseMethods";
import WebSocketMethods from "./utils/webSocketMethods";
import moment from "moment";
import bcrypt from "bcryptjs";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import eventEmitter from "./utils/EventEmitter";

const ChatContent = ({ chatId, userId, lastMessage, dateTime, onBack }) => {
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await localDatabase.fetchAllChatMessages(chatId);
        setMessages(msgs.reverse());
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]); // Imposta un array vuoto in caso di errore
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
    

    // Cleanup: rimuove i listener quando l'effetto si smonta o `chatId` cambia
    // return () => {
    //   eventEmitter.off("newMessage", handleReceiveMessage);
    //   eventEmitter.off("updateMessage", handleUpdateMessage);
    // };
  }, []);

  // useEffect(() => {
  //   const loadMessages = async () => {
  //     try {
  //       const msgs = await localDatabase.fetchAllChatMessages(chatId);
  //       // Inverte l'ordine dei messaggi
  //       setMessages(msgs.reverse());
  //     } catch (error) {
  //       console.error("Error loading messages:", error);
  //     }
  //   };
  //   loadMessages();

  //   const handleReceiveMessage = eventEmitter.on("newMessage", (data) => {
  //     const newMessage = {
  //       message_id: data.message_id,
  //       sender: data.sender,
  //       text: data.text,
  //       date_time: data.date,
  //     };
  //     setMessages((currentMessages) => [newMessage, ...currentMessages]);
  //   });

  //   const handleUpdateMessage = eventEmitter.on("updateMessage", (data) => {
  //     const { date, message_id, hash } = data;
  //     // console.log("::::::::::::::::::::::::::::::::::", hash);

  //     setMessages(
  //       messages.map((message) =>
  //         message.hash === hash ? { ...message, date: date } : message
  //       )
  //     );
  //   });
  // }, [chatId]);

  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) {
      return "";
    }

    const timeMoment = moment(dateTimeMessage);
    if (timeMoment.isValid()) {
      return timeMoment.format("HH:mm");
    } else {
      console.warn("Unexpected date/time format:", dateTimeMessage);
      return "";
    }
  };

  const generateHash = async (message, salt) => {
    try {
      salt = salt;
      const hashedMessage = await bcrypt.hash(message, salt);
      return hashedMessage;
    } catch (error) {
      console.error("Error in hash generation:", error);
      throw error;
    }
  };

  const addNewMessage = async () => {
    if (newMessageText.trim()) {
      try {
        // const hashedMessage = await generateHash(newMessageText);

        // console.log("Messaggio cifrato: ", hashedMessage);

        const salt = await bcrypt.genSalt();
        const hashedMessage = await generateHash(newMessageText, salt);

        // Crea un oggetto temporaneo per il nuovo messaggio
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

        // console.log("Hash appena inserito nel db: ", hashedMessage);

        // await db.searchMessageByHash(hashedMessage);

        WebSocketMethods.webSocketSenderMessage(
          JSON.stringify({
            type: "send_message",
            text: newMessageText,
            chat_id: chatId,
            salt: salt,
          })
        );

        // Aggiungi il nuovo messaggio all'inizio della lista
        setMessages((currentMessages) => [newMessage, ...currentMessages]);
        setNewMessageText("");
      } catch (error) {
        console.error("Error adding new message:", error);
      }
    }
  };

  const renderMessagesList = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.message_id || item.hash}
        renderItem={({ item }) => (
          <View
            style={
              item.sender === userId ? styles.msgSender : styles.msgReceiver
            }
          >
            <Text style={styles.textMessageContent}>{item.text}</Text>
            <Text style={styles.timeText}>
              {item.date_time == "" ? (
                <MaterialIcons name="access-time" size={14} color="#ffffff" />
              ) : (
                parseTime(item.date_time)
              )}
              {/* <MaterialIcons name="access-time" size={14} color="#ffffff" /> */}
            </Text>
          </View>
        )}
        inverted // Questa prop inverte la lista
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

  return (
    <SafeAreaView style={styles.container}>
      {renderMessagesList()}
      {renderBottomBar()}
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
      backgroundColor: "#2196F3", // Un colore blu di esempio, puoi cambiarlo
      borderRadius: 100, // Per un look più rotondo
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 10,
    },
  });
}
