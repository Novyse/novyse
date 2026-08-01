import React from "react";
import { View } from "react-native";

import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useWindowSizeStore, {
  SUBLIST_MIN,
  CHAT_MIN,
} from "@/src/context/WindowSizeContext";
import { useScreen } from "@/src/context/ScreenContext";
import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";

import CommsMembersLayout from "@/src/components/comms/CommsMembersLayout";
import CommsBottomBar from "@/src/components/comms/BottomBar";
import SubList from "@/src/components/chat/content/SubList";
import PanelResizeHandle from "@/src/components/layout/PanelResizeHandle";

import useCommsData from "@/src/hooks/comms/useCommsData";

const VocalContent = () => {
  const chatUUIDorHandle = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const chat = useActiveChatStore((state) => state.activeChatData);
  const { isSmallScreen } = useScreen();
  const { subListWidth, setSubListWidth } = useWindowSizeStore();
  const { room, participants } = useCommsData(chatUUIDorHandle, selectedSub);
  const isForum = chat?.type === "FORUM";

  const subListResizerHandlers = usePanelResizer({
    currentWidth: subListWidth,
    setWidth: setSubListWidth,
    minWidth: SUBLIST_MIN,
    maxWidthPadding: CHAT_MIN,
    reverse: false,
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        {isForum && (
          <SubList
            chat={chat}
            selectedSub={selectedSub}
            isSmallScreen={isSmallScreen}
            subListWidth={subListWidth}
            bottomBarHeight={60}
          />
        )}
        <View style={{ flex: 1, height: "100%", position: "relative" }}>
          {isForum && !isSmallScreen && (
            <PanelResizeHandle panHandlers={subListResizerHandlers} />
          )}
          <CommsMembersLayout
            participants={participants}
            room={room}
            chatUUID={chatUUIDorHandle}
            sub={selectedSub}
          />
        </View>
      </View>

      {chatUUIDorHandle && (
        <CommsBottomBar chatUUID={chatUUIDorHandle} sub={selectedSub} />
      )}
    </View>
  );
};

export default VocalContent;
