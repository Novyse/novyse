import React, { useContext } from "react";
import {
  View,
  StyleSheet,
  ListRenderItem,
  ViewStyle,
  TextStyle,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import BlurredView from "@/src/components/layout/BlurredView";
import Avatar from "@/src/components/ui/avatar/Avatar";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";

interface Member {
  uuid?: string;
  userUUID?: string;
  name: string;
  surname: string;
  profilePictureUUID: string;
  handle: string;
}

interface MentionBarProps {
  members: Member[] | null;
  onSelectMember: (member: Member) => void;
}

const MentionBar: React.FC<MentionBarProps> = ({ members, onSelectMember }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  if (!members || members.length === 0) return null;

  const renderItem: ListRenderItem<Member> = ({ item }) => (
    <HoverAndPressedButton
      style={styles.memberItem}
      onPress={() => onSelectMember(item)}
    >
      <Avatar size={32} uuid={item.profilePictureUUID}/>
      <View style={styles.memberInfo}>
        <Typography
          style={styles.memberName}
          numberOfLines={1}
          text={`${item.name} ${item.surname}`}
        />
        <Typography
          style={styles.memberHandle}
          numberOfLines={1}
          text={`@${item.handle}`}
        />
      </View>
    </HoverAndPressedButton>
  );

  const listHeight = Math.min(220, members.length * 53);

  return (
    <BlurredView style={[styles.container, { height: listHeight }]}>
      <FlashList
        data={members}
        renderItem={renderItem}
        keyExtractor={(item) => (item.uuid || item.userUUID || "").toString()}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={52}
        style={{ flex: 1 }}
      />
    </BlurredView>
  );
};

interface Styles {
  container: ViewStyle;
  listContent: ViewStyle;
  memberItem: ViewStyle;
  memberInfo: ViewStyle;
  memberName: TextStyle;
  memberHandle: TextStyle;
  separator: ViewStyle;
}

const createStyle = (theme: any): Styles =>
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
      color: theme.subtitle,
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
