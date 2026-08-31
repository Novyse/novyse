import React from "react";

import AppHeader from "@/src/components/features/header/AppHeader";
import { headerIconButtonStyle } from "@/src/components/features/header/AppHeaderRow";
import Icon from "@/src/components/ui/icon/Icon";
import StatusHeader from "@/src/components/features/chatListAndSearch/header/StatusHeader";
import { tabNavigator } from "@/src/utils/navigation/tabRef";

interface ChatListHeaderProps {
  commsHeader?: React.ReactNode;
  collapsed?: boolean;
  onCreateChat?: () => void;
}

const ChatListHeader = ({
  commsHeader,
  collapsed,
  onCreateChat,
}: ChatListHeaderProps) => {
  return (
    <AppHeader
      collapsed={collapsed}
      onPress={() => tabNavigator.navigate("Search")}
      left={
        !collapsed ? (
          <Icon
            name="Search01Icon"
            onPress={() => tabNavigator.navigate("Search")}
            style={headerIconButtonStyle.iconButton}
          />
        ) : undefined
      }
      center={
        collapsed ? (
          <Icon
            name="Search01Icon"
            onPress={() => tabNavigator.navigate("Search")}
            style={headerIconButtonStyle.iconButton}
          />
        ) : undefined
      }
      right={
        !collapsed ? (
          <Icon
            name="PlusSignIcon"
            onPress={onCreateChat}
            style={headerIconButtonStyle.iconButton}
          />
        ) : undefined
      }
      footer={commsHeader}
      belowBlur={<StatusHeader />}
    />
  );
};

export default ChatListHeader;
