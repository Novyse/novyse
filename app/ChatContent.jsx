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
import APIMethods from "./utils/APImethods";
import * as Linking from "expo-linking";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  PlusSignIcon,
  Mic02Icon,
  SmileIcon,
  SentIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { LinearGradient } from "expo-linear-gradient";
import SmartBackground from "./components/SmartBackground";
import EmojiPicker from "./components/EmojiPicker";

const ChatContent = ({
  chatJoined,
  chatId,
  userId,
  onBack,
  onJoinSuccess,
  contentView,
}) => {
  const messagesRef = useRef([]);
  const [messages, setMessages] = useState([]);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);  const [newMessageText, setNewMessageText] = useState("");
  const [isVoiceMessage, setVoiceMessage] = useState(true);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);

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
  const urlRegex =
    /(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])(\S*)/g; //PERFETTO

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

  // capisco se una parte del messaggio è un link oppure no
  const LinkedText = ({ text, style }) => {
    if (!text) return null;

    // Trova tutte le corrispondenze
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      // Aggiungi testo prima del link
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`t-${lastIndex}`} style={style}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }

      // Prepara URL per il click
      const linkUrl = match[0].startsWith("http")
        ? match[0]
        : `https://${match[0]}`;

      // Aggiungi il link
      parts.push(
        <Text
          key={`l-${match.index}`}
          style={[
            styles.messagesLink,
            Platform.OS === "web" && {
              wordBreak: "break-all",
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap",
            },
          ]}
          onPress={() =>
            Platform.OS === "web"
              ? window.open(linkUrl, "_blank")
              : Linking.openURL(linkUrl)
          }
        >
          {match[0]}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    // Aggiungi testo rimanente
    if (lastIndex < text.length) {
      parts.push(
        <Text key={`t-last`} style={style}>
          {text.substring(lastIndex)}
        </Text>
      );
    }

    return parts.length ? parts : <Text style={style}>{text}</Text>;
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
        params.creatingChatWith !== undefined &&
        params.creatingChatWith !== "undefined"
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

  // gestisco quando viene premuto il pulsante emoji
  const handleEmojiPress = () => {
    console.log("Emoji button pressed");
    setIsEmojiPickerVisible(true);
  };

  // gestisco quando viene selezionato un emoji
  const handleEmojiSelected = (emoji) => {
    console.log("Emoji selected:", emoji);
    setNewMessageText(prevText => prevText + emoji);
    setVoiceMessage(false); // Switch to send button when emoji is added
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
      left: x,
      top: y,
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

    if (messages.length === 0) return prepared;

    messages.forEach((message) => {
      const key = moment(message.date_time || new Date()).format("DD-MM-YYYY");

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
        data={prepareMessages(messages)}
        keyExtractor={(item) => item.uniqueKey}
        renderItem={({ item }) => {
          if (item.type === "separator") {
            return (
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{item.data}</Text>
              </View>
            );
          } else {
            const message = item.data;
            return (
              <LinearGradient
                colors={theme.messageContainerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={
                  message.sender == userId
                    ? styles.msgSender
                    : styles.msgReceiver
                }
              >
                <Pressable
                  onLongPress={(e) => handleLongPress(e, message)}
                  style={styles.messagePressable}
                >
                  {/* Usa il componente LinkedText */}
                  <LinkedText
                    text={message.text}
                    style={styles.textMessageContent}
                  />                  <Text style={styles.timeText}>
                    {message.date_time === "" ? (
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={14}
                        color={theme.icon}
                        strokeWidth={1.5}
                      />
                    ) : (
                      parseTime(message.date_time)
                    )}
                  </Text>
                </Pressable>
              </LinearGradient>
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
      "Rendering bottom bar with chatJoined:",
      chatJoined,
      "contentView:",
      contentView
    );
    return (
      <View style={styles.bottomBarContainer}>
        {chatJoined || contentView === "both" ? (
          <View
            style={{
              paddingBottom: 10,
              flexDirection: "row",
              width: "100%",
              alignItems: "center",
            }}
          >
            
            <Pressable style={styles.iconButton}>
              <HugeiconsIcon
                icon={PlusSignIcon}
                size={24}
                color={theme.icon}
                strokeWidth={1.5}
              />
            </Pressable>
            <LinearGradient
              colors={theme.backgroundChatTextInputGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bottomTextBarContainer}
            >              <TextInput
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
              />              <Pressable style={styles.iconButton} onPress={handleEmojiPress}>
                <HugeiconsIcon
                  icon={SmileIcon}
                  size={24}
                  color={theme.icon}
                  strokeWidth={1.5}
                />
              </Pressable>
            </LinearGradient>            {isVoiceMessage ? (
              <Pressable onPress={handleVoiceMessage} style={styles.iconButton}>
                <HugeiconsIcon
                  icon={Mic02Icon}
                  size={24}
                  color={theme.icon}
                  strokeWidth={1.5}
                />
              </Pressable>
            ) : (
              <Pressable onPress={handleSendMessage} style={styles.iconButton}>
                <HugeiconsIcon
                  icon={SentIcon}
                  size={24}
                  color={theme.icon}
                  strokeWidth={1.5}
                />
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
          </View>        )}
      </SafeAreaView>
      
      {/* EmojiPicker Modal */}
      <EmojiPicker
        visible={isEmojiPickerVisible}
        onClose={handleEmojiPickerClose}
        onEmojiSelected={handleEmojiSelected}
      />
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
    textMessageContent: {
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
      position: "relative",      ...(Platform.OS === "web" && {
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
    dateSeparator: {
      alignSelf: "center",
      backgroundColor: theme.dateSeparatorBackground,
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
  });
}
