import { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  ActivityIndicator,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router, useFocusEffect } from "expo-router";
import AppText from "@/src/components/ui/text/AppText";
import { useTranslation } from "react-i18next";
import { ScrollBar } from "@/constants/ScrollBar";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeContext } from "@/src/context/ThemeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useChatStore from "@/src/context/ChatContext";
import useUserStore from "@/src/context/UserContext";
import Label from "@/src/components/ui/label/Label";

import gateway from "@/src/utils/backend-services/api-gateway";
import database from "@/src/utils/storage/database";
import Icon from "@/src/components/ui/icon/Icon";
import Avatar from "@/src/components/ui/avatar/Avatar";
import AppHeader from "@/src/components/features/header/AppHeader";
import { headerIconButtonStyle } from "@/src/components/features/header/AppHeaderRow";
import { getAppHeaderScrollPaddingTop } from "@/src/components/features/header/constants";
import ChatListItemSearch from "@/src/components/features/chatListAndSearch/ChatListItemSearch";
import BaseListItem from "@/src/components/features/chatListAndSearch/BaseListItem";

import { tabNavigator } from "@/src/utils/navigation/tabRef";
import { useStatusBannerOffset } from "@/src/hooks/useStatusBannerOffset";
import useNetworkStore from "@/src/context/NetworkContext";

interface SearchResult {
  uuid: string | null;
  handle: string | null;
  name: string;
  surname?: string;
  type: "USER" | "GROUP" | "FORUM" | "CHANNEL" | "DM";
  profilePictureUUID?: string;
  memberCount?: number;
  isRemote?: boolean;
}

interface MessageResult {
  id: number;
  chatUUID: string;
  subID: number;
  senderUUID: string;
  content: string;
  created_at: string;
  sender_name?: string;
  profile_picture_uuid?: string;
}

type ListRow =
  | { kind: "section"; label: string; key: string }
  | { kind: "chat"; item: SearchResult; key: string }
  | { kind: "message"; item: MessageResult; key: string };

const Search = () => {
  const { t } = useTranslation();
  const { theme } = useThemeContext();
  const setSelectedHandle = useActiveChatStore(
    (state) => state.setSelectedHandle,
  );
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  const setScrollToMessageID = useActiveChatStore(
    (state) => state.setScrollToMessageID,
  );
  const setMessageHighlight = useActiveChatStore(
    (state) => state.setMessageHighlight,
  );
  const chats = useChatStore((state) => state.chats);
  const users = useUserStore((state) => state.users);
  const localUserUUID = useUserStore((state) => state.localUserUUID);
  const insets = useSafeAreaInsets();
  const statusBannerOffset = useStatusBannerOffset();
  const apiError = useNetworkStore((state) => state.apiError);
  const styles = createStyle(theme, insets, statusBannerOffset);

  const [responseArray, setResponseArray] = useState<SearchResult[]>([]);
  const [messageResults, setMessageResults] = useState<MessageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }, [])
  );

  useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  const searchLocalChats = (query: string): SearchResult[] => {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const chat of chats) {
      if (chat.type === "DM") {
        const otherMember = chat.members?.find(
          (m: any) => m.uuid !== localUserUUID,
        );
        const targetUUID = otherMember?.uuid || localUserUUID;
        const user = users[targetUUID || ""];
        const isSaved = !otherMember || (chat.members?.length || 0) === 1;
        const name = isSaved
          ? "Saved Messages"
          : `${user?.name || ""}${user?.surname ? ` ${user.surname}` : ""}`.trim();
        const haystack = `${name}`.toLowerCase();
        if (!haystack.includes(q)) continue;
        results.push({
          uuid: chat.uuid,
          handle: null,
          name: name || "User",
          surname: isSaved ? undefined : user?.surname,
          type: "DM",
          profilePictureUUID: user?.profilePictureUUID,
          memberCount: chat.members?.length || 0,
        });
      } else {
        const name = chat.name || "";
        const handle = (chat as any).handle || "";
        const haystack = `${name} ${handle}`.toLowerCase();
        if (!haystack.includes(q)) continue;
        results.push({
          uuid: chat.uuid,
          handle,
          name,
          type: chat.type as "GROUP" | "FORUM" | "CHANNEL",
          profilePictureUUID: chat.profilePictureUUID,
          memberCount: chat.members?.length || 0,
        });
      }
    }

    return results;
  };

  const handleChange = (value: string) => {
    // Clear the previous timer if it exists
    if (timer) clearTimeout(timer);
    setTimer(null); // Reset the timer state

    const trimmedValue = value.trim();

    // Empty query: reset everything.
    if (trimmedValue === "") {
      setIsLoading(false);
      setResponseArray([]);
      setMessageResults([]);
      setIsSearching(false);
      return;
    }

    // Local messages + local chats from 1 char; remote chats/users from 3.
    const canSearchLocal = trimmedValue.length >= 1;
    const canSearchRemote = trimmedValue.length >= 3;

    if (!canSearchLocal) {
      setIsLoading(false);
      setResponseArray([]);
      setMessageResults([]);
      setIsSearching(false);
      return;
    }

    setIsLoading(true);
    setResponseArray([]);
    setMessageResults([]);
    setIsSearching(true);

    const timerOnChange = setTimeout(async () => {
      const localChats = searchLocalChats(trimmedValue);

      const messagePromise = database.message
        .search(trimmedValue, { limit: 30 })
        .then((rows: any[]) => setMessageResults(rows || []))
        .catch(() => setMessageResults([]));

      let remote: SearchResult[] = [];
      if (canSearchRemote) {
        try {
          const result = (await gateway.search.all(trimmedValue)) as {
            success: boolean;
            data: any;
          };
          const { success, data } = result;
          if (!success) throw new Error("Search API call failed");

          const { users: remoteUsers = [], chats: remoteChats = [] } = data;
          remote = [
            ...remoteUsers.map((user: any) => ({
              ...user,
              type: "USER" as const,
              isRemote: true,
            })),
            ...remoteChats.map((chat: any) => ({
              ...chat,
              type: (chat.type || "GROUP") as "GROUP" | "FORUM" | "CHANNEL",
              isRemote: true,
            })),
          ];
        } catch (error) {
          console.error("Error in search:", error);
          remote = [];
        }
      }

      // Local first, then remote — skip remote entries already covered locally
      // (same handle or same uuid).
      const localKeys = new Set(
          localChats.flatMap(
              (c) => [c.uuid, c.handle?.toLowerCase()].filter(Boolean) as string[],
          ),
      );
      const merged = [
        ...localChats,
        ...remote.filter((r) => {
          if (r.uuid && localKeys.has(r.uuid)) return false;
          if (r.handle && localKeys.has(r.handle.toLowerCase())) return false;
          return true;
        }),
      ];
      setResponseArray(merged);

      await messagePromise;
      setIsLoading(false);
    }, 500); // Delay of 500ms (debounce)

    // Save the reference to the new timer
    setTimer(timerOnChange);
  };

  const chatNameOf = (chatUUID: string) => {
    const c = chats.find((ch: any) => ch.uuid === chatUUID);
    return c?.name || "";
  };

  const handleMessagePress = (msg: MessageResult) => {
    const subID = msg.subID ?? 0;
    const term = searchText.trim();
    const content = String(msg.content || "")
      .trimStart()
      .replace(/(^|\s)@(\w+)/g, "$1[@$2](/profile/$2)");
    const i = term ? content.toLowerCase().indexOf(term.toLowerCase()) : -1;

    if (i >= 0) {
      setMessageHighlight({
        chatUUID: msg.chatUUID,
        subID,
        messageID: msg.id,
        rangeStart: i,
        rangeEnd: i + term.length,
      });
    } else {
      setMessageHighlight(null);
    }

    const active = useActiveChatStore.getState();
    const setSelectedSub = useActiveChatStore.getState().setSelectedSub;

    if (active.selectedChatUUID === msg.chatUUID) {
      if ((active.selectedSub ?? 0) !== subID) {
        setSelectedSub(subID);
        router.push(`/app/chat/${msg.chatUUID}/${subID}`);
      }
      setTimeout(() => setScrollToMessageID(String(msg.id)), 0);
    } else {
      setScrollToMessageID(String(msg.id));
      setSelectedChatUUID(msg.chatUUID, subID);
    }
  };

  const listData: ListRow[] = [];
  if (responseArray.length > 0) {
    listData.push({
      kind: "section",
      label: "tabs.search.chats",
      key: "section-chats",
    });
    responseArray.forEach((item, i) =>
      listData.push({ kind: "chat", item, key: `chat-${i}` }),
    );
  }
  if (messageResults.length > 0) {
    listData.push({
      kind: "section",
      label: "tabs.search.messages",
      key: "section-messages",
    });
    messageResults.forEach((item) =>
      listData.push({
        kind: "message",
        item,
        key: `msg-${item.chatUUID}-${item.subID}-${item.id}`,
      }),
    );
  }

  const renderItem = ({ item }: { item: ListRow }) => {
    if (item.kind === "section") {
      return <Label translationKey={item.label} />;
    }
    if (item.kind === "chat") {
      return (
        <ChatListItemSearch
          item={item.item as any}
          onPress={(handle) => {
            if (item.item.isRemote && handle) {
              setSelectedHandle(handle);
            } else if (item.item.uuid) {
              setSelectedChatUUID(item.item.uuid);
            } else {
              setSelectedHandle(handle);
            }
          }}
        />
      );
    }
    const msg = item.item;
    const subtitleNode = (
      <AppText
        style={styles.messageContent}
        numberOfLines={1}
        text={msg.content || ""}
      />
    );
    const dateNode = !!chatNameOf(msg.chatUUID) ? (
      <AppText
        style={styles.messageChatName}
        numberOfLines={1}
        text={chatNameOf(msg.chatUUID)}
      />
    ) : null;
    const renderAvatar = () => (
      <Avatar uuid={msg.profile_picture_uuid} style={styles.avatar} />
    );

    return (
      <BaseListItem
        id={msg.id}
        title={msg.sender_name || ""}
        subtitleNode={subtitleNode}
        dateNode={dateNode}
        renderAvatar={renderAvatar}
        onPress={() => handleMessagePress(msg)}
      />
    );
  };

  const hasResults = responseArray.length > 0 || messageResults.length > 0;

  return (
    <>
      <AppHeader
        left={
          <Icon
            name="Search01Icon"
            hoverColor={theme.iconHover}
            style={headerIconButtonStyle.iconButton}
            onPress={() => {}}
          />
        }
        center={
          <TextInput
            ref={inputRef}
            placeholder={t("tabs.search.search")}
            placeholderTextColor={theme.placeholderText}
            style={styles.searchBar}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              handleChange(text);
            }}
          />
        }
        right={
          <Icon
            name="Cancel01Icon"
            hoverColor={theme.iconHover}
            onPress={() => {
              tabNavigator.navigate("ChatList");
              setSearchText("");
              handleChange("");
            }}
            style={headerIconButtonStyle.iconButton}
          />
        }
      />
      {isLoading && !hasResults && (
        <ActivityIndicator
          size="large"
          color={theme.icon}
          style={styles.loader}
        />
      )}
      {hasResults && (
        <FlashList
          data={listData}
          renderItem={renderItem}
          contentContainerStyle={styles.flatListContent}
          keyExtractor={(item) => item.key}
          getItemType={(item) => item.kind}
          style={styles.results}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
      {isSearching && !isLoading && !hasResults && !apiError && (
        <AppText
          style={styles.noResults}
          translationKey="tabs.search.noResults"
        />
      )}
    </>
  );
};

export default Search;

const createStyle = (theme: any, insets: any, statusBannerOffset: number) => {
  const contentTop = getAppHeaderScrollPaddingTop(insets.top, {
    statusBannerOffset,
  });

  return StyleSheet.create({
    searchBar: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      outlineStyle: "none" as any,
      minWidth: 30,
      marginLeft: 5,
      paddingVertical: 15
    },
    loader: {
      marginTop: contentTop,
    },
    results: {
      flex: 1,
      ...ScrollBar(theme),
    },
    noResults: {
      marginTop: contentTop,
      paddingHorizontal: 20,
      textAlign: "center",
      color: theme.text,
      fontSize: 16,
    },
    flatListContent: {
      padding: 10,
      paddingTop: contentTop,
      paddingBottom: 10 + insets.bottom,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.placeholderText,
      textTransform: "uppercase",
      paddingHorizontal: 6,
      paddingTop: 6,
      paddingBottom: 2,
    },
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 20,
    },
    messageChatName: {
      fontSize: 12,
      color: theme.placeholderText,
      flexShrink: 0,
    },
    messageContent: {
      fontSize: 14,
    },
  });
};

