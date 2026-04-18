import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import AppText from "@/src/components/AppText";
import { createPortal } from "react-dom";

import { useCommsContext } from "@/context/CommsContext";

import useCommsAction from "@/src/hooks/comms/useCommsAction";
import useLayout from "@/src/hooks/comms/useLayout";

import UserCard from "./UserCard";
import CommsMenu from "./CommsMenu";

const PADDING_TOP = 160;
const PADDING_BOTTOM = 110;
const PADDING_LEFT = 6;
const PADDING_RIGHT = 6;

const CommsMembersLayout = ({ participants = [], room, chatUUID, sub }) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const {
    triggeredStream,
    setTriggeredStream,
    triggeredPosition,
    isSpeakingMap,
  } = useCommsContext();

  const adjustedDimensions = {
    width: Math.max(0, containerDimensions.width - PADDING_LEFT - PADDING_RIGHT),
    height: Math.max(0, containerDimensions.height - PADDING_TOP - PADDING_BOTTOM),
  };

  const {
    layoutItems,
    rectWidth,
    rectHeight,
    margin,
    handlePin,
    handleFullScreen,
  } = useLayout(room, participants, adjustedDimensions);

  // Layout Handler
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []);

  const speakingStates = useMemo(() => {
    const map = {};
    layoutItems.forEach((item) => {
      map[item.deviceUUID] = isSpeakingMap.get(item.deviceUUID) || false;
    });
    return map;
  }, [isSpeakingMap, layoutItems]);

  const {
    pinnedStreamUUID,
    fullscreenStreamUUID,
    stopScreenShare,
    facingMode,
  } = useCommsAction();

  if (fullscreenStreamUUID) {
    const item = layoutItems.find((i) => i.streamUUID === fullscreenStreamUUID);
    if (item) {
      const fullscreenContent = (
        <View style={styles.fullscreenContainer}>
          <UserCard
            streamUUID={item.streamUUID}
            deviceUUID={item.deviceUUID}
            chatUUID={chatUUID}
            sub={sub}
            stream={item.stream}
            displayName={item.name}
            metadata={item.metadata}
            isLocal={item.isLocal}
            isScreenShare={item.isScreenShare}
            isPinned={pinnedStreamUUID === item.streamUUID}
            isFullScreen={true}
            onPin={handlePin}
            onFullScreen={handleFullScreen}
            stopScreenShare={stopScreenShare}
            margin={0}
            isSpeaking={speakingStates[item.deviceUUID]}
            facingMode={facingMode}
          />
          <CommsMenu
            visible={!!triggeredStream}
            onClose={() => setTriggeredStream(null)}
            streamUUID={triggeredStream?.streamUUID}
            deviceUUID={triggeredStream?.deviceUUID}
            displayName={triggeredStream?.displayName}
            isScreenShare={triggeredStream?.isScreenShare}
            isLocal={triggeredStream?.isLocal}
            position={triggeredPosition}
          />
        </View>
      );
      if (Platform.OS === "web") {
        return createPortal(fullscreenContent, document.body);
      }
      return fullscreenContent;
    }
  }

  const renderRectangle = (
    streamUUID,
    deviceUUID,
    stream,
    name,
    metadata,
    isLocal,
    isScreenShare,
  ) => {
    return (
      <UserCard
        streamUUID={streamUUID}
        deviceUUID={deviceUUID}
        chatUUID={chatUUID}
        sub={sub}
        stream={stream}
        displayName={name}
        metadata={metadata}
        isLocal={isLocal}
        isScreenShare={isScreenShare}
        isPinned={pinnedStreamUUID === streamUUID}
        isFullScreen={fullscreenStreamUUID === streamUUID}
        onPin={handlePin}
        onFullScreen={handleFullScreen}
        stopScreenShare={stopScreenShare}
        width={rectWidth}
        height={rectHeight}
        margin={margin}
        isSpeaking={speakingStates[deviceUUID]}
        facingMode={facingMode}
      />
    );
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View
        style={[
          styles.grid,
          {
            width: containerDimensions.width,
          },
        ]}
      >
        {layoutItems.length > 0 ? (
          <>
            {layoutItems.map((item) => {
              const {
                deviceUUID,
                streamUUID,
                name,
                metadata,
                stream,
                isScreenShare,
                isLocal,
              } = item;
              return (
                <View key={`${deviceUUID}-${streamUUID}`}>
                  {renderRectangle(
                    streamUUID,
                    deviceUUID,
                    stream,
                    name,
                    metadata,
                    isLocal,
                    isScreenShare,
                  )}
                </View>
              );
            })}
          </>
        ) : (
          <AppText
            style={styles.emptyChatText}
            translationKey="chat.comms.noParticipants"
          />
        )}
      </View>
      <CommsMenu
        visible={!!triggeredStream}
        onClose={() => setTriggeredStream(null)}
        streamUUID={triggeredStream?.streamUUID}
        deviceUUID={triggeredStream?.deviceUUID}
        displayName={triggeredStream?.displayName}
        isScreenShare={triggeredStream?.isScreenShare}
        isLocal={triggeredStream?.isLocal}
        position={triggeredPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenContainer: {
    position: Platform.OS === "web" ? "fixed" : "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: 10000,
  },
  grid: {
    paddingTop: 160,
    paddingBottom: 110,
    paddingHorizontal: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "center",
    rowGap: 0,
    columnGap: 0,
    overflow: "hidden",
    ...(Platform.OS === "android" && {
      position: "relative",
      zIndex: 1,
    }),
  },
  emptyChatText: {
    color: "white",
    fontSize: 20,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    padding: 8,
    margin: 0,
    borderRadius: 8,
    alignContent: "center",
  },
});

export default CommsMembersLayout;
