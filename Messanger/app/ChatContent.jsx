import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  FlatList,
} from "react-native";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import LocalDatabase from "./utils/localDatabaseMethods";
import moment from 'moment'; 

const ChatContent = ({ chatId, userId, lastMessage, dateTime, onBack }) => {
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  const [messages, setMessages] = useState([]);

  const db = new LocalDatabase();

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await db.fetchAllChatMessages(chatId);
        // Inverte l'ordine dei messaggi
        setMessages(msgs.reverse());
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };
    loadMessages();
  }, [chatId]);

  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) {
      return ''; 
    }

    const timeMoment = moment(dateTimeMessage); 
    if (timeMoment.isValid()) {
      return timeMoment.format('HH:mm'); 
    } else {
      console.warn("Unexpected date/time format:", dateTimeMessage);
      return ''; 
    }
  };

  const renderMessagesList = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.message_id}
        renderItem={({ item }) => (
          <View style={item.sender === userId ? styles.msgSender : styles.msgReceiver}>
            <Text style={styles.provaText}>{item.text}</Text>
            <Text style={styles.timeText}>{parseTime(item.date_time)}</Text> 
          </View>
        )}
        inverted // Questa prop inverte la lista
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderMessagesList()}
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
    provaText: {
      color: theme.text,
    },
    timeText: {
      color: theme.text,
      fontSize: 12,
    },
    msgSender: {
      backgroundColor: "#2b5278",
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderTopRightRadius: 0,
      alignSelf: "flex-end",
      alignItems: 'flex-end',
    },
    msgReceiver: {
      backgroundColor: "#2b5278",
      marginVertical: 5,
      padding: 10,
      maxWidth: "70%",
      borderRadius: 10,
      borderTopLeftRadius: 0,
      alignSelf: "flex-start",
      alignItems: 'flex-start',
    },
    listContainer: {
      flex: 1,
    },
  });
}