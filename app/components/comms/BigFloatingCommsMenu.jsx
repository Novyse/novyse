import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import VocalBottomBarButton from "./VocalBottomBarButton";
import { ThemeContext } from "@/context/ThemeContext";
import {
  Mic02Icon,
  MicOff02Icon,
  Video02Icon,
  VideoOffIcon,
  ComputerScreenShareIcon,
} from "@hugeicons/core-free-icons";
import utils from "../../utils/webrtc/utils";
const { self, check } = utils;

const BigFloatingCommsMenu = ({
  onScreenShare = () => {},
}) => {
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  // Stato per audio/video
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  // Funzioni per toggle
  const toggleAudio = async () => {
    setIsAudioEnabled(await self.toggleAudio());
  };
  const toggleVideo = async () => {
    setIsVideoEnabled(await self.toggleVideo());
  };

  return (
    <View style={styles.container}>
      <View style={styles.menuItems}>
        <VocalBottomBarButton
          onPress={toggleAudio}
          iconName={isAudioEnabled ? Mic02Icon : MicOff02Icon}
          iconColor="#fff"
        />
        <VocalBottomBarButton
          onPress={toggleVideo}
          iconName={isVideoEnabled ? Video02Icon : VideoOffIcon}
          iconColor="#fff"
        />
        <VocalBottomBarButton
          onPress={onScreenShare}
          iconName={ComputerScreenShareIcon}
          iconColor="#fff"
        />
      </View>
    </View>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      zIndex: 999,
      alignItems: "center",
      bottom: 10,
      left: 10,
      right: 10,
      backgroundColor: theme.bigFloatingCommsMenu,
      paddingHorizontal: 10,
      paddingVertical: 30,
      borderRadius: 13,
    },
    menuItems: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
  });
}

export default BigFloatingCommsMenu;