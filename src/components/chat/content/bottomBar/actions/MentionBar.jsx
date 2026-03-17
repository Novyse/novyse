import React, { useContext } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import BlurredView from "@/src/components/BlurredView";
import Avatar from "@/src/components/Avatar";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";

const MentionBar = ({ members, onSelectMember }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  if (!members || members.length === 0) return null;

  const renderItem = ({ item }) => (
    <HoverAndPressedButton
      style={styles.memberItem}
      onPress={() => onSelectMember(item)}
    >
      <Avatar
        size={32}
        name={item.name}
        surname={item.surname}
        profilePictureUUID={item.profilePictureUUID}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {item.name} {item.surname}
        </Text>
        <Text style={styles.memberHandle} numberOfLines={1}>
          @{item.handle}
        </Text>
      </View>
    </HoverAndPressedButton>
  );

  return (
    <BlurredView style={styles.container}>
      <FlatList
        data={members}
        renderItem={renderItem}
        keyExtractor={(item) => item.uuid || item.userUUID}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
    </BlurredView>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      maxHeight: 220,
      borderRadius: 20,
      marginBottom: 5,
      overflow: "hidden",
    },
    listContent: {
      gap: 0,
    },
    memberItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 0,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    memberInfo: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    memberName: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 14,
    },
    memberHandle: {
      color: theme.placeholderText,
      fontSize: 14,
    },
    separator: {
      height: 1,
      backgroundColor: theme.separator,
      marginHorizontal: 15,
      opacity: 0.1,
    },
  });

export default MentionBar;
