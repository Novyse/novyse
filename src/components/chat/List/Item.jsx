import React, { useContext } from "react";
import { View, Text } from "react-native";
import { DateTime } from "luxon";

import SmartBackground from "@/src/components/SmartBackground";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import Avatar from "@/src/components/Avatar";

import { LocalUserContext } from "@/context/LocalUserContext";

const ChatListItem = React.memo(
  ({ item, isSelected, onPress, onLongPress, theme, styles }) => {
    const { userUUID } = useContext(LocalUserContext);
    const parseTime = (dateTimeMessage) => {
      if (!dateTimeMessage) return "";
      return DateTime.fromJSDate(new Date(dateTimeMessage)).toFormat("HH:mm");
    };

    const displayMessage = (message) => {
      if (!message) return null;
      let content = message.content;
      let sender = "";
      if (message.senderUUID === userUUID) {
        sender = "You: ";
      } else if (message.senderUUID && message.sender_name) {
        sender = `${message.sender_name}: `;
      } else if (message.type === "system") {
        sender = "";
      } else {
        sender = "Unknown: ";
      }
      return (
        <Text
          style={[styles.chatSubtitle, styles.gridText]}
          numberOfLines={1}
          ellipsizeMode="tail"
          selectable={false}
        >
          {sender}
          {content}
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
          onPress={() => onPress(item.uuid)}
          onLongPress={() => onLongPress(item.uuid)}
          style={styles.chatItemPressable}
        >
          {isSelected && (
            <View style={styles.selectionIndicator}>
              <Icon name={"Tick02Icon"} size={24} />
            </View>
          )}
          <Avatar
            uuid={item.profilePictureUUID}
            theme={theme}
            style={styles.avatar}
          />
          <View style={styles.chatItemGrid}>
            <View style={styles.leftContainer}>
              <Text
                style={[styles.chatTitle, styles.gridText, { marginBottom: 5 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                selectable={false}
              >
                {item.name}
              </Text>
              {displayMessage(item.lastMessage)}
            </View>
            <View style={styles.rightContainer}>
              <View style={styles.dateContainer}>
                {!item.lastMessage?.created_at ? (
                  <Icon name={"Clock01Icon"} size={14} />
                ) : (
                  <>
                    <Icon name={"TickDouble02Icon"} size={18} />
                    <Text style={styles.chatDateText} selectable={false}>
                      {parseTime(item.lastMessage?.created_at)}
                    </Text>
                  </>
                )}
              </View>
              <View style={[styles.ball]}>
                <Text style={[styles.ballText]} selectable={false}>
                  17
                </Text>
              </View>
            </View>
          </View>
        </HoverAndPressedButton>
      </SmartBackground>
    );
  },
);

export default ChatListItem;
