import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";

import { useCommsContext } from "@/context/CommsContext";

import useCommsAction from "@/src/hooks/comms/useCommsAction";
import useLayout from "@/src/hooks/comms/useLayout";

import UserCard from "./UserCard";

const CommsMembersLayout = ({ participants = [], room }) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const {
    layoutItems,
    rectWidth,
    rectHeight,
    margin,
    handlePin,
    handleFullScreen,
  } = useLayout(room, participants, containerDimensions);

  // Layout Handler
  const onContainerLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  }, []);

  const { isSpeakingMap } = useCommsContext();

  const speakingStates = useMemo(() => {
    const map = {};
    layoutItems.forEach((item) => {
      map[item.deviceUUID] = isSpeakingMap.get(item.deviceUUID) || false;
    });
    return map;
  }, [isSpeakingMap, layoutItems]);

  const { pinnedStreamUUID, fullscreenStreamUUID, stopScreenShare } =
    useCommsAction();

  if (fullscreenStreamUUID) {
    const item = layoutItems.find((i) => i.streamUUID === fullscreenStreamUUID);
    if (item) {
      return (
        <View style={styles.fullscreenContainer}>
          <UserCard
            streamUUID={item.streamUUID}
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
            isSpeaking={speakingStates[item.participant.identity]}
          />
        </View>
      );
    }
  }

  const renderRectangle = (
    streamUUID,
    stream,
    name,
    metadata,
    isLocal,
    isScreenShare,
  ) => {
    return (
      <UserCard
        streamUUID={streamUUID}
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
        isSpeaking={speakingStates[streamUUID]}
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
          <Text style={styles.emptyChatText}>There is no one here.</Text>
        )}
      </View>
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
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: 10000,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "center",
    padding: 0,
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
