import { useContext } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useScreen } from "@/src/context/ScreenContext";

import Icon from "@/src/components/ui/icon/Icon";
import Avatar from "@/src/components/ui/avatar/Avatar";
import AppHeaderRow, {
  headerIconButtonStyle,
} from "@/src/components/features/header/AppHeaderRow";

import { ThemeContext } from "@/src/context/ThemeContext";

import chatUtils from "@/src/utils/chat/messageFormat";

const MainHeader = ({
  chatUUIDorHandle,
  chatType,
  subType,
  selectedChatName,
  selectedChatPictureUUID,
  memberCount,
  onlineMembersCount,
  memberActivityData,
  lastAccessAt,
  contentView,
  setContentView,
  onBack = () => router.back(),
  navToOverview,
  onOpenSearch,
}) => {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { isSmallScreen, isMediumScreen } = useScreen();
  const styles = createStyle();

  const canSendText = ["MIXED", "TEXT", "ANNOUNCE"].includes(subType);
  const canEnterVocal = ["MIXED", "VOCAL"].includes(subType);

  return (
    <AppHeaderRow
      left={
        <Icon
          name={
            isSmallScreen && onBack ? "ArrowLeft02Icon" : "MoreVerticalIcon"
          }
          onPress={isSmallScreen && onBack ? onBack : () => {}}
          style={headerIconButtonStyle.iconButton}
        />
      }
      center={
        <Pressable onPress={navToOverview} style={styles.headerCenter}>
          <Avatar
            uuid={selectedChatPictureUUID}
            theme={theme}
            isOnline={chatType === "DM" ? onlineMembersCount === 2 : false}
          />
          <View style={styles.headerCenterText}>
            <Typography
              weight="semibold"
              numberOfLines={1}
              text={selectedChatName}
            />
            {memberActivityData && memberActivityData.length > 0 ? (
              <Typography
                size="xs"
                variant="subtitle"
                numberOfLines={1}
                text={chatUtils.formatActivity(memberActivityData, chatType)}
              />
            ) : (
              <>
                {chatType === "DM" &&
                  onlineMembersCount === 1 &&
                  lastAccessAt && (
                    <Typography
                      size="xs"
                      variant="subtitle"
                      numberOfLines={1}
                      text={`${t("chat.header.lastSeen")}: ${chatUtils.formatLastSeen(lastAccessAt)}`}
                    />
                  )}
                {chatType === "GROUP" && (
                  <Typography
                    size="xs"
                    variant="subtitle"
                    numberOfLines={1}
                    text={`${t("chat.header.members", { count: memberCount })}${onlineMembersCount > 0 ? `, ${t("chat.header.online", { count: onlineMembersCount })}` : ""}`}
                  />
                )}
              </>
            )}
          </View>
        </Pressable>
      }
      right={
        <>
          {onOpenSearch && ["MIXED", "TEXT", "ANNOUNCE"].includes(subType) && (
            <Icon
              name="Search01Icon"
              style={headerIconButtonStyle.iconButton}
              onPress={onOpenSearch}
            />
          )}
          {subType === "MIXED" && contentView !== "chat" && (
            <Icon
              name="Message02Icon"
              style={headerIconButtonStyle.iconButton}
              onPress={() => setContentView("chat")}
            />
          )}
          {subType === "MIXED" && contentView !== "vocal" && (
            <Icon
              name="AudioWave01Icon"
              style={headerIconButtonStyle.iconButton}
              onPress={() => setContentView("vocal")}
            />
          )}
          {subType === "MIXED" &&
            !isSmallScreen &&
            !isMediumScreen &&
            contentView !== "both" && (
              <Icon
                name="BorderVerticalIcon"
                style={headerIconButtonStyle.iconButton}
                onPress={() => setContentView("both")}
              />
            )}
        </>
      }
    />
  );
};

function createStyle() {
  return StyleSheet.create({
    headerCenter: {
      gap: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenterText: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

export default MainHeader;
