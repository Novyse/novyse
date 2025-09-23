import React, { useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Platform,
} from "react-native";
import moment from "moment";
import SmartBackground from "./components/SmartBackground";
import Search from "./Search";
import eventEmitter from "./utils/EventEmitter";
import HoverAndPressedButton from "./components/HoverAndPressedButton";
import Icon from "./components/Icon";
import SmallCommsMenu from "./components/comms/SmallCommsMenu"; // Solo per small screen
import methods from "./utils/webrtc/methods";

// Hooks
import useChats from "./hooks/useChats";
import useAppInit from "./hooks/useAppInit";

// Context
import { ChatContext } from "../context/ChatContext";

const { get, check } = methods;

// Top-level memoized list item to avoid re-creating component on every render
const ChatListItem = React.memo(
  ({
    uuid,
    name,
    pictureUUID,
    lastMessageSender,
    lastMessageText,
    lastMessageDate,
    isSelected,
    onPress,
    theme,
    styles,
  }) => {
    return (
      <SmartBackground
        colors={
          isSelected
            ? theme?.backgroundChatSelectedInsideListGradient
            : theme?.backgroundChatInsideListGradient
        }
        style={styles.chatItem}
      >
        <HoverAndPressedButton
          onPress={() => onPress(uuid)}
          style={styles.chatItemPressable}
        >
          <Image
            source={{ uri: "https://picsum.photos/200" }}
            style={styles.avatar}
          />
          <View style={styles.chatItemGrid}>
            <View style={styles.leftContainer}>
              <Text
                style={[styles.chatTitle, styles.gridText, { marginBottom: 5 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {name}
              </Text>
              <Text
                style={[styles.chatSubtitle, styles.gridText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {lastMessageText}
              </Text>
            </View>
            <View style={styles.rightContainer}>
              <Text
                style={[styles.chatDate, styles.gridText, { marginBottom: 5 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {lastMessageDate === "" ? (
                  <Icon name={"Clock01Icon"} size={15} />
                ) : (
                  lastMessageDate
                )}
              </Text>
              <Text style={[styles.staticNumber, styles.gridText]}>123</Text>
            </View>
          </View>
        </HoverAndPressedButton>
      </SmartBackground>
    );
  },
  (prev, next) => {
    // shallow compare important primitive props to avoid re-render
    return (
      prev.name === next.name &&
      prev.uuid === next.uuid &&
      prev.isSelected === next.isSelected &&
      prev.lastMessageText === next.lastMessageText &&
      prev.lastMessageDate === next.lastMessageDate
    );
  }
);

const ChatList = ({
  onChatSelect,
  isToggleSearchChats,
  setIsToggleSearchChats,
  theme,
  colorScheme,
}) => {
  useAppInit(true);
  const { selectedChatUUID } = useContext(ChatContext);
  const { chatDetails, loading, error } = useChats();

  const styles = createStyle(theme, colorScheme);

  // COMMS ROBA NON TOCCARE
  // useEffect per comms events (locale per forceUpdate)
  useEffect(() => {
    const handleCommsStateChange = (data) => {
      if (data.from === get.myPartecipantId()) {
        setForceUpdate((prev) => prev + 1);
      }
    };
    eventEmitter.on("member_joined_comms", handleCommsStateChange);
    eventEmitter.on("member_left_comms", handleCommsStateChange);
    return () => {
      eventEmitter.off("member_joined_comms", handleCommsStateChange);
      eventEmitter.off("member_left_comms", handleCommsStateChange);
    };
  }, []);

  // shouldShowSmallCommsMenu (locale per small screen)
  const shouldShowSmallCommsMenu = () => {
    if (isToggleSearchChats) return false; // Non mostrare se search attiva
    const isInComms = check.isInComms();
    if (isInComms) {
      const commsId = get.commsId();
      if (selectedChatUUID !== commsId) return true;
      // Assumi "chat" view per default, poiché contentView è in ChatContainer
      return true;
    }
    return false;
  };

  const renderSmallCommsMenu = () =>
    shouldShowSmallCommsMenu() ? <SmallCommsMenu /> : null;
  // COMMS ROBA NON TOCCARE

  // callback per onPress chat item
  const handleChatPress = React.useCallback(
    (chatUUID) => {
      onChatSelect(chatUUID);
    },
    [onChatSelect]
  );

  // parseTime invariato
  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) return "";
    const timeMoment = moment(dateTimeMessage);
    return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedChatUUID === item.uuid;
    console.log("Rendering chat item:", item.name, "Selected:", isSelected);
    return (
      <ChatListItem
        uuid={item.uuid}
        name={item.name}
        pictureUUID={item.profilePictureUUID}
        lastMessageSender={item.lastMessage?.name}
        lastMessageText={item.lastMessage?.text}
        lastMessageDate={parseTime(item.lastMessage?.date_time)}
        isSelected={isSelected}
        onPress={handleChatPress}
        theme={theme}
        styles={styles}
      />
    );
  };

  const memoizedRenderItem = React.useMemo(
    () => renderItem,
    [selectedChatUUID]
  );

  const renderChatList = () => (
    <SmartBackground
      colors={theme?.backgroundChatListGradient}
      style={[styles.chatListContainer]}
    >
      <FlatList
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        extraData={selectedChatUUID}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        data={Object.values(chatDetails)}
        keyExtractor={(item) => item.uuid}
        renderItem={memoizedRenderItem}
      />
    </SmartBackground>
  );

  return (
    <View style={styles.chatListWrapper}>
      {renderSmallCommsMenu()}
      {!isToggleSearchChats ? renderChatList() : <Search />}
    </View>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    chatListContainer: {
      flex: 1,
      position: "relative",
    },
    chatListWrapper: {
      flex: 1,
      position: "relative",
      paddingBottom: 10,
    },
    flatList: {
      flex: 1,
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
    flatListContent: {
      padding: 10,
      paddingTop: 0,
    },
    chatItem: {
      borderRadius: 13,
      marginBottom: 10,
    },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      width: "100%",
      flex: 1,
      borderRadius: 13,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    chatTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
    },
    chatSubtitle: {
      fontSize: 14,
      color: theme.text,
    },
    chatItemGrid: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "space-between",
    },
    leftContainer: {
      flex: 1,
      flexDirection: "column",
    },
    rightContainer: {
      flexDirection: "column",
      alignItems: "flex-end",
    },
    gridText: {
      fontSize: 14,
      color: theme.text,
    },
    chatDate: {
      textAlign: "right",
    },
    staticNumber: {
      textAlign: "right",
    },
    searchButton: {
      marginLeft: "auto",
    },
  });
}

export default React.memo(ChatList);