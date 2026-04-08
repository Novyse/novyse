import React, { useContext } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { router } from "expo-router";

import Icon from "@/src/components/Icon";
import Avatar from "@/src/components/Avatar";

import { ThemeContext } from "@/context/ThemeContext";

import chatUtils from "@/src/utils/chat/messageFormat";

const MainHeader = ({
  chatUUIDorHandle,
  chatType,
  selectedChatName,
  selectedChatPictureUUID,
  memberCount,
  onlineMembersCount,
  memberActivityData,
  contentView,
  setContentView,
  onBack = () => router.back(),
  navToOverview,
  isSmallScreen,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.headerMainRow}>
      <View style={styles.headerLeft}>
        <Icon
          name={
            isSmallScreen && onBack ? "ArrowLeft02Icon" : "MoreVerticalIcon"
          }
          onPress={isSmallScreen && onBack ? onBack : () => {}}
          style={styles.iconButton}
        />
      </View>

      <Pressable onPress={navToOverview} style={styles.headerCenter}>
        <Avatar
          uuid={selectedChatPictureUUID}
          theme={theme}
          isOnline={chatType === "DM" ? onlineMembersCount === 2 : false}
        />
        <View style={styles.headerCenterText}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {selectedChatName}
          </Text>
          {memberActivityData && memberActivityData.length > 0 ? (
            <Text style={styles.chatSubtitle} numberOfLines={1}>
              {chatUtils.formatActivity(memberActivityData, chatType)}
            </Text>
          ) : (
            chatType === "GROUP" && (
              <Text style={styles.chatSubtitle} numberOfLines={1}>
                {memberCount +
                  " members" +
                  (onlineMembersCount > 0
                    ? ", " + onlineMembersCount + " online"
                    : "")}
              </Text>
            )
          )}
        </View>
      </Pressable>

      <View style={styles.headerRight}>
        {contentView !== "chat" && (
          <Icon
            name="Message02Icon"
            style={styles.iconButton}
            onPress={() => setContentView("chat")}
          />
        )}
        {contentView !== "vocal" && (
          <Icon
            name="AudioWave01Icon"
            style={styles.iconButton}
            onPress={() => setContentView("vocal")}
          />
        )}
        {!isSmallScreen && contentView !== "both" && (
          <Icon
            name="BorderVerticalIcon"
            style={styles.iconButton}
            onPress={() => setContentView("both")}
          />
        )}
      </View>
    </View>
  );
};

function createStyle(theme) {
  const HEADER_MAIN_HEIGHT = 55;
  const ICON_SIZE = 40;

  return StyleSheet.create({
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      height: HEADER_MAIN_HEIGHT,
      width: "100%",
    },
    headerLeft: {
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
      gap: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    iconButton: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    headerCenterText: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    chatTitle: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      flexShrink: 1,
    },
    chatSubtitle: {
      fontSize: 12,
      color: theme.text,
      textAlign: "center",
      flexShrink: 1,
    },
  });
}

export default MainHeader;
