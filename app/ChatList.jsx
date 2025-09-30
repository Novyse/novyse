import React, { useContext, useCallback } from "react";
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
import HoverAndPressedButton from "./components/HoverAndPressedButton";
import Icon from "./components/Icon";
import HeaderBase from "./components/HeaderBase";

// Hooks
import useChats from "./hooks/useChats";
import useAppInit from "./hooks/useAppInit";

// Context
import { ChatContext } from "../context/ChatContext";
import { UserContext } from "../context/UserContext";

// Top-level memoized list item to avoid re-creating component on every render
const ChatListItem = React.memo(
  ({
    uuid,
    name,
    pictureUUID,
    lastMessage,
    isSelected,
    onPress,
    theme,
    styles,
  }) => {
    const { userUUID } = useContext(UserContext);

    const parseTime = (dateTimeMessage) => {
      if (!dateTimeMessage) return "";
      const timeMoment = moment(dateTimeMessage);
      return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
    };
    const displayMessage = (message) => {
      // Text message calculationsz
      if (!message) return null;
      let text = message.text;
      switch (message.type) {
        case "text":
          break;
        case "image":
          text = "📷 Photo";
          break;
        case "file":
          text = "📎 File";
          break;
        case "audio":
          text = "🎵 Audio";
          break;
        case "video":
          text = "🎥 Video";
          break;
        case "system":
          // Do nothing here, handled below
          break;
        default:
          return null;
      }

      let sender = "";

      // Sender name
      if (
        message.senderUUID &&
        message.sender_name &&
        message.type !== "system"
      ) {
        sender =
          message.senderUUID === userUUID
            ? "You: "
            : `${message.sender_name}: `;
      }

      return (
        <Text
          style={[styles.chatSubtitle, styles.gridText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {sender}
          {text}
        </Text>
      );
    };
    return (
      <SmartBackground
        colors={
          isSelected
            ? theme?.backgroundChatListItemSelectedGradient
            : theme?.backgroundChatListItemGradient
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
              {displayMessage(lastMessage)}
            </View>
            <View style={styles.rightContainer}>
              <View style={styles.dateContainer}>
                {!lastMessage?.created_at ? (
                  <Icon name={"Clock01Icon"} size={15} />
                ) : (
                  <>
                    <Icon name={"TickDouble02Icon"} size={18} />
                    <Text style={styles.chatDateText}>
                      {parseTime(lastMessage?.created_at)}
                    </Text>
                  </>
                )}
              </View>

              <View style={[styles.ball]}>
                <Text style={[styles.ballText]}>17</Text>
              </View>
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
      prev.lastMessage === next.lastMessage &&
      prev.theme === next.theme &&
      prev.styles === next.styles
    );
  }
);

const ChatList = ({
  onChatSelect,
  isToggleSearchChats,
  setIsToggleSearchChats,
  theme,
  colorScheme,
  toggleSidebar,
}) => {
  useAppInit(true);
  const { selectedChatUUID } = useContext(ChatContext);
  const { chatDetails, loading } = useChats();

  const styles = createStyle(theme, colorScheme);

  // callback per onPress chat item
  const handleChatPress = React.useCallback(
    (chatUUID) => {
      onChatSelect(chatUUID);
    },
    [onChatSelect]
  );

  const renderHeader = useCallback(
    () => (
      <HeaderBase>
        <Icon name={"Menu02Icon"} size={32} onPress={toggleSidebar} />
        <Image
          source={require("../assets/images/logo-novyse.png")}
          style={styles.logo}
        />
        {/* <Text style={styles.headerTitle}>Novyse</Text> */}
        <Icon
          name={"Search02Icon"}
          size={32}
          onPress={() => setIsToggleSearchChats((prev) => !prev)}
        />
      </HeaderBase>
    ),
    [
      toggleSidebar,
      setIsToggleSearchChats,
      styles.headerTitle,
      styles.searchButton,
    ]
  );

  const renderItem = ({ item }) => {
    const isSelected = selectedChatUUID === item.uuid;
    return (
      <ChatListItem
        uuid={item.uuid}
        name={item.name}
        pictureUUID={item.profilePictureUUID}
        lastMessage={item.lastMessage}
        isSelected={isSelected}
        onPress={handleChatPress}
        theme={theme}
        styles={styles}
      />
    );
  };

  const memoizedRenderItem = React.useMemo(
    () => renderItem,
    [selectedChatUUID, theme]
  );

  const renderChatList = () => (
    <FlatList
      style={styles.flatList}
      contentContainerStyle={styles.flatListContent}
      extraData={[selectedChatUUID, theme]}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      data={Object.values(chatDetails)}
      keyExtractor={(item) => item.uuid}
      renderItem={memoizedRenderItem}
    />
  );

  return (
    <SmartBackground
      colors={theme?.backgroundChatListGradient}
      style={[styles.chatListContainer]}
    >
      <View style={styles.chatListWrapper}>
        {renderHeader()}
        {!isToggleSearchChats ? renderChatList() : <Search />}
      </View>
    </SmartBackground>
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
        // Standard per Firefox (fisso, no active/drag change)
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::-webkit-scrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    flatListContent: {
      padding: 10,
      gap: 10,
    },
    chatItem: {
      borderRadius: 15,
      height: 65,
    },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      width: "100%",
      flex: 1,
      borderRadius: 15,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    logo: {
      width: 24,
      height: 24,
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
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    ball: {
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.badgeColor,
      addingHorizontal: 5,
    },
    ballText: {
      textAlign: "center",
      color: theme.text,
      fontSize: 12,
    },
    dateContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginBottom: 5,
    },
    chatDateText: {
      fontSize: 14,
      color: theme.text,
      textAlign: "right",
      marginLeft: 5,
    },
  });
}

export default React.memo(ChatList);
