import { useContext, useState } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useRouter } from "expo-router";
import FloatingButton from "@/src/components/ui/button/FloatingButton";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";
import useUserStore from "@/src/store/UserStore";
import { FlashList } from "@shopify/flash-list";
import BaseListItem from "@/src/components/features/chatListAndSearch/BaseListItem";
import messageUtils from "@/src/utils/chat/messageFormat";
import CreateSubModal from "@/src/components/features/sub/createSub/CreateSubModal";
import { hasPermission, PERMISSIONS } from "@/src/utils/chat/permissions";

import VocalSubSubtitle from "./VocalSubSubtitle";
import useCommsAction from "@/src/hooks/comms/useCommsAction";
import { useCommsContext } from "@/src/context/CommsContext";
import BlurredView from "@/src/components/layout/BlurredView";

const SubList = ({
  chat,
  selectedSub,
  isSmallScreen,
  subListWidth,
  bottomBarHeight = 0,
  hasActionBars = false,
}) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const headerHeight = useActiveChatStore((state) => state.headerHeight) || 60;
  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const styles = createStyle(theme);
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
          defaultPreview={lastMsgPreview}
        />
      ) : (
        <Typography
          size="sm"
          variant="subtitle"
          ellipsizeMode="tail"
          numberOfLines={1}
          text={lastMsgPreview || ""}
        />
      );

    const renderAvatar = () => (
      <View style={[styles.avatar, isActive && styles.activeAvatar]}>
        <Typography
          size="xl"
          weight="semibold"
          variant={isActive ? "default" : "subtitle"}
          text={sub.name ? sub.name[0].toUpperCase() : "#"}
        />
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
          marginBottom: (bottomBarHeight || 0) + (hasActionBars ? 10 : 0),
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
          position={{
            bottom: 20,
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

function createStyle(theme: any) {
  return StyleSheet.create({
    container: {
      flexGrow: 0,
      flexShrink: 0,
      position: "relative",
      borderRadius: 25,
      overflow: "hidden",
    },
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 25,
      backgroundColor: theme.backgroundMain,
      justifyContent: "center",
      alignItems: "center",
    },
    activeAvatar: {
      backgroundColor: theme.primary,
    },
  });
}

export default SubList;
