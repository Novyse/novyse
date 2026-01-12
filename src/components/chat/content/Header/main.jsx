import React, { useContext } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import Icon from "@/src/components/Icon";

import { ThemeContext } from "@/context/ThemeContext";

const MainHeader = ({
  selectedChatName,
  contentView,
  setContentView,
  isSmallScreen,
  onBack,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.headerMainRow}>
      <View style={styles.headerLeft}>
        <Icon
          name={
            isSmallScreen && onBack ? "ArrowLeft02Icon" : "MoreVerticalIcon"
          }
          onPress={isSmallScreen && onBack ? onBack : () => {}}
          style={styles.iconButton}
        />
      </View>

      <View style={styles.headerCenter}>
        <Image
          source={{ uri: "https://picsum.photos/200" }}
          style={styles.avatar}
        />
        <Text style={styles.chatTitle} numberOfLines={1}>
          {selectedChatName}
        </Text>
      </View>

      <View style={styles.headerRight}>
        {contentView !== "chat" && (
          <Icon
            name="Message02Icon"
            style={styles.iconButton}
            onPress={() => setContentView("chat")}
          />
        )}
        {contentView !== "vocal" && (
          <Icon
            name="AudioWave01Icon"
            style={styles.iconButton}
            //onPress={() => setContentView("vocal")}
          />
        )}
        {/* {!isSmallScreen && contentView !== "both" && (
          <Icon
            name="BorderVerticalIcon"
            style={styles.iconButton}
            onPress={() => setContentView("both")}
          />
        )} */}
      </View>
    </View>
  );
};

function createStyle(theme) {
  const HEADER_MAIN_HEIGHT = 55;
  const ICON_SIZE = 40;

  return StyleSheet.create({
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      height: HEADER_MAIN_HEIGHT,
      width: "100%",
    },
    headerLeft: {
      flex: 1,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    headerRight: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    iconButton: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: theme.placeholder || "#ccc",
    },
    chatTitle: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      flexShrink: 1,
    },
  });
}

export default MainHeader;
