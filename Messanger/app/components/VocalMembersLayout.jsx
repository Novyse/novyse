import React, { useState, useEffect, useContext } from "react";
import { View, StyleSheet, Text, Pressable, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

// Costanti
const ASPECT_RATIO = 16 / 9;

const VocalMembersLayout = ({ profiles, WebRTC }) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [layout, setLayout] = useState({
    width: 0,
    height: 0,
    columns: 1,
    rows: 1,
  });
  const { theme } = useContext(ThemeContext);

  // Handler per il layout
  const onContainerLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  };

  // Calcolo ottimizzato del layout
  useEffect(() => {
    const { width: containerWidth, height: containerHeight } =
      containerDimensions;
    if (!containerWidth || !containerHeight) return;

    // Count total items (profiles + screen shares)
    const screenShareCount = Object.keys(WebRTC.remoteStreams).filter((id) =>
      id.startsWith("screen_")
    ).length;
    const totalItems = profiles.length + screenShareCount;

    const findBestFit = (maxLoops, isWidthPrimary) => {
      let bestFit = null;

      for (let i = 1; i <= maxLoops; i++) {
        const divisions = isWidthPrimary ? i : Math.ceil(totalItems / i);
        const secondaryDivisions = isWidthPrimary
          ? Math.ceil(totalItems / i)
          : i;

        // ... rest of the existing layout calculation logic ...
      }

      return bestFit;
    };

    const bestFit =
      findBestFit(totalItems, true) || findBestFit(totalItems, false);

    setLayout(
      bestFit || {
        width: containerWidth,
        height: containerWidth / ASPECT_RATIO,
        columns: 1,
        rows: 1,
      }
    );
  }, [containerDimensions, profiles.length, WebRTC.remoteStreams]); // Added remoteStreams dependency

  const renderProfile = (profile) => (
    <Pressable key={profile.from} style={styles.profile}>
      <View style={styles.videoContainer}>
        {profile.from === WebRTC.myId && WebRTC.localStream ? (
          Platform.OS === "web" ? (
            <>
              <RTCView
                stream={WebRTC.localStream}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          ) : (
            <>
              <RTCView
                streamURL={WebRTC.localStream.toURL()}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          )
        ) : WebRTC.remoteStreams[profile.from] ? (
          Platform.OS === "web" ? (
            <>
              <RTCView
                stream={WebRTC.remoteStreams[profile.from]}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          ) : (
            <>
              <RTCView
                streamURL={WebRTC.remoteStreams[profile.from].toURL()}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 10,
                }}
                muted={true}
              />
              <Text style={styles.profileText}>{profile.handle}</Text>
            </>
          )
        ) : null}
        <Text style={styles.profileText}>{profile.handle}</Text>
      </View>
    </Pressable>
  );

  const renderScreenShare = (streamId, stream) => {
    // Check if this is a screen share stream
    if (!streamId.startsWith('screen_')) return null;

    return (
      <Pressable key={streamId} style={[styles.profile, styles.screenShare]}>
        <View style={styles.videoContainer}>
          {Platform.OS === "web" ? (
            <RTCView
              stream={stream}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 10,
              }}
              objectFit="contain"
              muted={true}
            />
          ) : (
            <RTCView
              streamURL={stream.toURL()}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 10,
              }}
              objectFit="contain"
              muted={true}
            />
          )}
          <Text style={styles.profileText}>Screen Share</Text>
        </View>
      </Pressable>
    );
  };

  const getAllScreenShares = () => {
    return Object.entries(WebRTC.remoteStreams)
      .filter(([id]) => id.startsWith('screen_'))
      .map(([id, stream]) => renderScreenShare(id, stream));
  };

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View style={[styles.grid, { width: containerDimensions.width }]}>
        {profiles.length > 0 ? (
          <>
            {profiles.map(renderProfile)}
            {getAllScreenShares()}
          </>
        ) : (
          <Text style={styles.profileText}>Nessun utente nella chat</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15,
  },
  profile: {
    backgroundColor: "black",
    borderRadius: 10,
    flexGrow: 1,
    maxWidth: "30%",
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    aspectRatio: 16 / 9,
    overflow: "hidden",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    borderRadius: 10,
  },
  videoStream: {},
  profileText: {
    color: "white",
    fontSize: 16,
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 5,
    margin: 0,
    borderRadius: 5,
    alignContent: "center",
  },
  screenShare: {
    maxWidth: "45%", // Screen shares get more space
    backgroundColor: "#1a1a1a", // Slightly different background to distinguish
  },
});

export default VocalMembersLayout;
