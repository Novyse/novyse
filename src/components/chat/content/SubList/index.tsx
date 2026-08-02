import React, { useContext, useState } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useRouter } from "expo-router";
import FloatingButton from "@/src/components/FloatingButton";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useUserStore from "@/src/context/UserContext";
import { FlashList } from "@shopify/flash-list";
import BaseListItem from "@/src/components/chat/list/BaseListItem";
import messageUtils from "@/src/utils/chat/messageFormat";
import CreateSubModal from "@/src/components/features/sub/createSub/CreateSubModal";
import { hasPermission, PERMISSIONS } from "@/src/utils/chat/permissions";

import VocalSubSubtitle from "./VocalSubSubtitle";
import useCommsAction from "@/src/hooks/comms/useCommsAction";
import { useCommsContext } from "@/src/context/CommsContext";
import BlurredView from "@/src/components/BlurredView";

const SubList = ({
  chat,
  selectedSub,
  isSmallScreen,
  subListWidth,
  bottomBarHeight = 0,
}) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const headerHeight = useActiveChatStore((state) => state.headerHeight) || 60;
  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const styles = createStyle(theme, isSmallScreen);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const { checkRoomMatch } = useCommsContext();
  const { join } = useCommsAction(chat?.uuid, selectedSub);

  // If width is very small (e.g. less than 150), only show initials
  const isCollapsed = isSmallScreen || subListWidth < 150;

  const myMember = chat?.members?.find(
    (m: any) => (m.uuid || m.userUUID) === localUserUUID,
  );
  const myRoleIDs = myMember?.roleIDs || [];
  const myRoles = (chat?.roles || []).filter((r: any) =>
    myRoleIDs.some((id: number) => Number(r.id) === Number(id)),
  );

  const canManageSub = hasPermission(myRoles, PERMISSIONS.MANAGE_SUB);

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

    const subtitleNode =
      sub.type === "VOCAL" ? (
        <VocalSubSubtitle
          chatUUID={chat.uuid}
          subId={sub.id}
          theme={theme}
          defaultPreview={lastMsgPreview}
          listStyles={styles}
        />
      ) : (
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
        onPress={() => {
          if (sub.type === "VOCAL") {
            const isJoined = checkRoomMatch(chat.uuid, sub.id);
            if (!isJoined) {
              join(chat.uuid, sub.id);
              return;
            }
          }
          router.push(`/app/chat/${chat.uuid}/${sub.id}`);
        }}
        renderAvatar={renderAvatar}
      />
    );
  };

  return (
    <BlurredView
      style={[
        styles.container,
        {
          width: isSmallScreen ? 70 : subListWidth,
          marginTop: headerHeight,
          marginBottom: bottomBarHeight || 0,
          marginLeft: 10,
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
        contentContainerStyle={{ padding: 10 }}
      />

      {canManageSub && (
        <FloatingButton
          onPress={() => setCreateModalVisible(true)}
          iconName="PlusSignIcon"
          size={isCollapsed ? 16 : 20}
          width={isCollapsed ? 40 : 50}
          height={isCollapsed ? 40 : 50}
          position={{
            bottom: 15,
            right: isCollapsed ? 15 : 20,
          }}
        />
      )}

      <CreateSubModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        chatUUID={chat.uuid}
      />
    </BlurredView>
  );
};

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      flexGrow: 0,
      flexShrink: 0,
      position: "relative",
      borderRadius: 25,
      overflow: "hidden",
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
