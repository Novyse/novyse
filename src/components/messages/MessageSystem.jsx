import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/store/UserStore";
import BlurredView from "../layout/BlurredView";
import messageUtils from "@/src/utils/chat/messageFormat";

const MessageSystem = ({ type, data }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles();

  // trigger re-renders when user data changes
  useUserStore((state) => state.users[data?.content]);

  const systemText =
    type === "system" ? messageUtils.getSystemMessageText(data) : "";

  const renderPill = (content) => (
    <BlurredView
      colors={theme.backgroundDateSeparator}
      style={styles.container}
    >
      <Typography size="xs" weight="semibold" text={content} />
    </BlurredView>
  );

  switch (type) {
    case "date":
      return renderPill(data);
    case "system":
      return renderPill(systemText);
    case "separator-with-lines":
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 12,
            marginHorizontal: 15,
          }}
        >
          <View
            style={{
              flex: 1,
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.backgroundDateSeparator,
            }}
          />
          <View style={{ marginHorizontal: 10 }}>{renderPill(data)}</View>
          <View
            style={{
              flex: 1,
              height: StyleSheet.hairlineWidth,
              backgroundColor: theme.backgroundDateSeparator,
            }}
          />
        </View>
      );
    default:
      return null;
  }
};

const createStyles = () => {
  return StyleSheet.create({
    container: {
      alignSelf: "center",
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 5,
      marginVertical: 5,
    },
  });
};

export default MessageSystem;
