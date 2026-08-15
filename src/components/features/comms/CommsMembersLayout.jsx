import { useState, useCallback, useMemo, useContext, useRef, useEffect } from "react";
import { View, StyleSheet, Platform, Modal, Dimensions } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import { useCommsContext } from "@/src/context/CommsContext";
import { ThemeContext } from "@/src/context/ThemeContext";

import useCommsAction from "@/src/hooks/comms/useCommsAction";
import useLayout from "@/src/hooks/comms/useLayout";

import UserCard from "./UserCard";
import CommsMenu from "./CommsContextMenu";
import PulseEmptyState from "@/src/components/features/animations/pulse/PulseEmptyState";

const PADDING_TOP = 160;
const PADDING_BOTTOM = 110;
const PADDING_LEFT = 5;
const PADDING_RIGHT = 5;

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
  const [containerBounds, setContainerBounds] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const updateContainerBounds = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      setContainerBounds({ x, y, width, height });
    });
  }, []);

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
  const onContainerLayout = useCallback(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      setContainerDimensions({ width, height });
      updateContainerBounds();
    },
    [updateContainerBounds],
  );

  useEffect(() => {
    if (triggeredStream) {
      updateContainerBounds();
    }
  }, [triggeredStream, updateContainerBounds]);

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

  const isMobile = Platform.OS === "android" || Platform.OS === "ios";

  const renderRectangle = (
    streamUUID,
    deviceUUID,
    stream,
    name,
    metadata,
    isLocal,
    isScreenShare,
    forFullscreen = false,
  ) => {
    const isWatchTogether =
      deviceUUID === "watch-together" && streamUUID === "watch-together";
    const isCurrentFullScreen = fullscreenStreamUUID === streamUUID;

    // On mobile fullscreen, use actual screen dimensions
    let fsWidth = containerDimensions.width;
    let fsHeight = containerDimensions.height;
    if (isMobile && isCurrentFullScreen) {
      const screen = Dimensions.get("screen");
      // In landscape the larger dimension is width
      fsWidth = Math.max(screen.width, screen.height);
      fsHeight = Math.min(screen.width, screen.height);
    }

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
        onRemove={stopScreenShare}
        width={isCurrentFullScreen ? fsWidth : rectWidth}
        height={isCurrentFullScreen ? fsHeight : rectHeight}
        margin={isCurrentFullScreen ? 0 : margin}
        isSpeaking={speakingStates[deviceUUID]}
        facingMode={facingMode}
      />
    );
  };

  // Find the fullscreen item (if any) for mobile modal rendering
  const fullscreenItem = fullscreenStreamUUID
    ? layoutItems.find((item) => item.streamUUID === fullscreenStreamUUID)
    : null;

  return (
    <View
      ref={containerRef}
      style={[styles.container, !!triggeredStream && styles.containerWithMenu]}
      onLayout={onContainerLayout}
    >
      {/* Mobile: render fullscreen content in a Modal for true immersive fullscreen */}
      {isMobile && fullscreenItem && (
        <Modal
          visible={true}
          animationType="none"
          statusBarTranslucent={true}
          supportedOrientations={["landscape"]}
          onRequestClose={() => handleFullScreen(fullscreenItem.streamUUID)}
        >
          <View style={styles.mobileFullscreenModal}>
            {renderRectangle(
              fullscreenItem.streamUUID,
              fullscreenItem.deviceUUID,
              fullscreenItem.stream,
              fullscreenItem.name,
              fullscreenItem.metadata,
              fullscreenItem.isLocal,
              fullscreenItem.isScreenShare,
              true,
            )}
          </View>
        </Modal>
      )}
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

              // On mobile, fullscreen is handled by Modal above
              if (isMobile && isCurrentFullScreen) {
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
          <View
            style={[
              styles.emptyState,
              containerDimensions.height > 0 && {
                height: Math.max(
                  containerDimensions.height - PADDING_TOP - PADDING_BOTTOM,
                  1,
                ),
              },
            ]}
          >
            {/* <PulseEmptyState> */}
              <Typography
                size="xl"
                translationKey="chat.comms.noParticipants"
              />
            {/* </PulseEmptyState> */}
          </View>
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
        containerBounds={containerBounds}
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
      position: "relative",
    },
    containerWithMenu: {
      zIndex: 300,
      elevation: 300,
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
    mobileFullscreenModal: {
      flex: 1,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
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
    emptyState: {
      width: "100%",
      flexGrow: 1,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
    },
  });

export default CommsMembersLayout;
