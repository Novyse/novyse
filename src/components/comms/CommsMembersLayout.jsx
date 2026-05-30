import React, {
  useState,
  useCallback,
  useMemo,
  useContext,
  useRef,
} from "react";
import { View, StyleSheet, Platform } from "react-native";
import AppText from "@/src/components/AppText";
import { createPortal } from "react-dom";

import { useCommsContext } from "@/src/context/CommsContext";
import { ThemeContext } from "@/src/context/ThemeContext";

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

  const containerRef = useRef(null);

  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const adjustedDimensions = {
    width: Math.max(
      0,
      containerDimensions.width - PADDING_LEFT - PADDING_RIGHT,
    ),
    height: Math.max(
      0,
      containerDimensions.height - PADDING_TOP - PADDING_BOTTOM,
    ),
  };

  const {
    layoutItems,
    rectWidth,
    rectHeight,
    margin,
    handlePin,
    handleFullScreen,
  } = useLayout(room, participants, adjustedDimensions, containerRef);

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

  const renderRectangle = (
    streamUUID,
    deviceUUID,
    stream,
    name,
    metadata,
    isLocal,
    isScreenShare,
  ) => {
    const isWatchTogether =
      deviceUUID === "watch-together" && streamUUID === "watch-together";
    const isCurrentFullScreen = fullscreenStreamUUID === streamUUID;

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
        isWatchTogether={isWatchTogether}
        isPinned={pinnedStreamUUID === streamUUID}
        isFullScreen={isCurrentFullScreen}
        onPin={handlePin}
        onFullScreen={handleFullScreen}
        onRemove={
          isWatchTogether
            ? async () => {
                try {
                  const gateway =
                    require("@/src/utils/backend-services/api-gateway").default;
                  await gateway.watchTogether.stop(
                    room?.name || room?.sid || chatUUID,
                  );
                } catch (e) {
                  console.error("Failed to stop watch together:", e);
                }
              }
            : stopScreenShare
        }
        width={isCurrentFullScreen ? containerDimensions.width : rectWidth}
        height={isCurrentFullScreen ? containerDimensions.height : rectHeight}
        margin={isCurrentFullScreen ? 0 : margin}
        isSpeaking={speakingStates[deviceUUID]}
        facingMode={facingMode}
      />
    );
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={onContainerLayout}
    >
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

              const isCurrentFullScreen = fullscreenStreamUUID === streamUUID;

              // Hide other items from view while fullscreen is active
              if (fullscreenStreamUUID && !isCurrentFullScreen) {
                return null;
              }

              return (
                <View
                  key={`${deviceUUID}-${streamUUID}`}
                  style={
                    isCurrentFullScreen ? styles.fullscreenContainer : null
                  }
                >
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

const createStyles = (theme) =>
  StyleSheet.create({
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
      backgroundColor: theme.shadowColor,
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
      color: theme.text,
      fontSize: 20,
      padding: 8,
      margin: 0,
      borderRadius: 8,
      alignContent: "center",
    },
  });

export default CommsMembersLayout;
