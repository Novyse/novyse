import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import BlurredView from "@/src/components/BlurredView";
import Avatar from "@/src/components/Avatar";

const MentionBar = ({ members, onSelectMember }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  if (!members || members.length === 0) return null;

  const renderItem = ({ item }) => (
    <TouchableOpacity
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
    </TouchableOpacity>
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
      backgroundColor: theme.backgroundCard,
      borderRadius: 18,
      marginBottom: 8,
      overflow: "hidden",
    },
    listContent: {
      paddingVertical: 8,
    },
    memberItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 12,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 14,
    },
    memberHandle: {
      color: theme.placeholderText,
      fontSize: 12,
    },
    separator: {
      height: 1,
      backgroundColor: theme.separator,
      marginHorizontal: 14,
      opacity: 0.1,
    },
  });

export default MentionBar;
