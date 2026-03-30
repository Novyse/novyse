import React, { useContext } from "react";
import { StyleSheet, Text } from "react-native";
import BlurredView from "@/src/components/BlurredView";
import Icon from "@/src/components/Icon";

import { ThemeContext } from "@/context/ThemeContext";

const PinnedMessages = ({ isSmallScreen }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isSmallScreen);

  return (
    <BlurredView style={styles.container}>
      <Text ellipsizeMode="tail" style={styles.text}>
        Messaggio pinnato
      </Text>
      <Icon name={"Cancel01Icon"} onPress={() => {}} />
    </BlurredView>
  );
};

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      height: 35,
      flex: 1,
      width: "100%",
      maxWidth: isSmallScreen ? "100%" : "50%",
      marginTop: 32,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      paddingVertical: 3,
      flexDirection: "row",
    },
    text: {
      color: theme.text,
    },
  });
}

export default React.memo(PinnedMessages);
