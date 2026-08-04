import React, { useContext, useState } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import { ThemeContext } from "@/src/context/ThemeContext";

// @SamueleOrazioDurante this is temporary, the final UI will be different, the buttons will work, and it will named differently
// since it is supposed to be used when you have no writing right to the chat
const ChannelBar = () => {
  const { theme } = useContext(ThemeContext);
  const [isMuted, setIsMuted] = useState(false);
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <HoverAndPressedButton
        style={styles.button}
        onPress={() => setIsMuted(!isMuted)}
      >
        <Icon
          name={isMuted ? "VolumeOffIcon" : "VolumeMaxIcon"}
          color={isMuted ? theme.subtitle : theme.primary}
        />
        <AppText
          style={[
            styles.text,
            { color: isMuted ? theme.subtitle : theme.primary },
          ]}
          text={isMuted ? "Enable notifications" : "Mute notifications"}
        />
      </HoverAndPressedButton>
    </View>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      width: "100%",
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      backgroundColor: theme.backgroundMainGradient
        ? theme.backgroundMainGradient[0]
        : theme.backgroundCard,
      borderRadius: 20,
      gap: 10,
    },
    text: {
      fontSize: 16,
      fontWeight: "600",
    },
  });
}

export default ChannelBar;
