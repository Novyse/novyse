import React, { useContext, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import AppText from "@/src/components/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useRouter } from "expo-router";
import FloatingButton from "@/src/components/FloatingButton";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import { FlashList } from "@shopify/flash-list";
import BaseListItem from "@/src/components/chat/list/BaseListItem";
import messageUtils from "@/src/utils/chat/messageFormat";
import CreateSubModal from "@/src/components/modalSheets/createSub";

const SubList = ({ chat, selectedSub, isSmallScreen, subListWidth }) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const headerHeight = useActiveChatStore((state) => state.headerHeight) || 60;
  const styles = createStyle(theme, isSmallScreen);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  // If width is very small (e.g. less than 150), only show initials
  const isCollapsed = isSmallScreen || subListWidth < 150;

  const getLastMessagePreview = (sub) => {
    if (chat.messages) {
      const subMessages = chat.messages.filter((m) => m.subID === sub.id);
      if (subMessages.length > 0) {
        const lastMsg = subMessages[subMessages.length - 1];
        return messageUtils.format(lastMsg).content;
      }
    }

    if (sub.lastMessage) {
      return messageUtils.format(sub.lastMessage).content;
    }

    return null;
  };

  const renderItem = ({ item: sub }) => {
    const isActive = selectedSub === sub.id;
    const lastMsgPreview = getLastMessagePreview(sub);

    const subtitleNode = (
      <AppText style={styles.preview} numberOfLines={1}>
        {lastMsgPreview || ""}
      </AppText>
    );

    const renderAvatar = () => (
      <View style={[styles.avatar, isActive && styles.activeAvatar]}>
        <AppText style={[styles.initial, isActive && styles.activeInitial]}>
          {sub.name ? sub.name[0].toUpperCase() : "#"}
        </AppText>
      </View>
    );

    return (
      <BaseListItem
        id={sub.id}
        title={sub.name || `Sub ${sub.id}`}
        subtitleNode={subtitleNode}
        dateNode={null}
        unreadCount={0}
        isSidebarCollapsed={isCollapsed}
        isSelected={false}
        isActive={isActive}
        isPinned={false}
        onPress={() => router.push(`/app/chat/${chat.uuid}/${sub.id}`)}
        renderAvatar={renderAvatar}
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: isSmallScreen ? 70 : subListWidth,
          paddingTop: headerHeight + 10,
        },
      ]}
    >
      <FlashList
        data={chat.subs || []}
        renderItem={renderItem}
        estimatedItemSize={60}
        keyExtractor={(item) => String(item.id)}
        extraData={{ selectedSub, isCollapsed }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <FloatingButton
        onPress={() => setCreateModalVisible(true)}
        iconName="PlusSignIcon"
        size={isCollapsed ? 16 : 20}
        width={isCollapsed ? 40 : 50}
        height={isCollapsed ? 40 : 50}
        position={{
          bottom: 20,
          right: isCollapsed ? 15 : 20,
        }}
      />

      <CreateSubModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        chatUUID={chat.uuid}
      />
    </View>
  );
};

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      height: "100%",
      paddingBottom: 10,
      position: "relative",
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundMain,
      justifyContent: "center",
      alignItems: "center",
    },
    activeAvatar: {
      backgroundColor: theme.primary,
    },
    initial: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.subtitle,
    },
    activeInitial: {
      color: theme.text,
    },
    preview: {
      fontSize: 13,
      color: theme.subtitle,
      marginTop: 2,
    },
  });
}

export default SubList;
