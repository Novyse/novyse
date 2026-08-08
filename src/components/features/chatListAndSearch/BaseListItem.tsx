import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import SmartBackground from "@/src/components/layout/SmartBackground";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";

import { ThemeContext } from "@/src/context/ThemeContext";

export interface BaseListItemProps {
  id: string | number;
  title: string;
  subtitleNode?: React.ReactNode;
  dateNode?: React.ReactNode;
  unreadCount?: number;
  isSidebarCollapsed?: boolean;
  isSelected?: boolean;
  isActive?: boolean;
  isPinned?: boolean;
  onPress?: (id: any) => void;
  onLongPress?: (id: any) => void;
  renderAvatar: () => React.ReactNode;
}

const BaseListItem = React.memo(
  ({
    id,
    title,
    subtitleNode,
    dateNode,
    unreadCount = 0,
    isSidebarCollapsed = false,
    isSelected = false,
    isActive = false,
    isPinned = false,
    onPress,
    onLongPress,
    renderAvatar,
  }: BaseListItemProps) => {
    const { theme } = useContext(ThemeContext);
    const styles = React.useMemo(() => createStyle(theme), [theme]);

    return (
      <View
        style={[
          styles.chatItem,
          isSidebarCollapsed && {
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <SmartBackground
          colors={
            isSelected || isActive
              ? theme.backgroundChatListItemSelectedGradient
              : null
          }
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 100 },
            isSidebarCollapsed && {
              width: 50,
              height: 50,
              left: "50%",
              top: "50%",
              marginLeft: -25,
              marginTop: -25,
            },
          ]}
        />
        <HoverAndPressedButton
          onPress={() => onPress && onPress(id)}
          onLongPress={() => onLongPress && onLongPress(id)}
          style={[
            styles.chatItemPressable,
            isSidebarCollapsed && {
              padding: 0,
              justifyContent: "center",
              alignItems: "center",
              width: 50,
              height: 50,
              minWidth: 50,
              maxWidth: 50,
              minHeight: 50,
              maxHeight: 50,
              borderRadius: 25,
              flex: 0,
              flexGrow: 0,
              gap: 0,
            },
          ]}
        >
          {isSelected && (
            <View
              style={[
                styles.selectionIndicator,
                isSidebarCollapsed && { top: 2, left: 2 },
              ]}
            >
              <Icon name={"Tick02Icon"} size={isSidebarCollapsed ? 12 : 16} />
            </View>
          )}
          <View
            style={[
              styles.avatarWrapper,
              isSidebarCollapsed && styles.avatarWrapperCollapsed,
            ]}
          >
            {renderAvatar()}
            {isSidebarCollapsed && unreadCount > 0 && (
              <View style={styles.collapsedUnreadBadge}>
                <Typography style={styles.ballText} text={unreadCount.toString()} />
              </View>
            )}
          </View>
          {!isSidebarCollapsed && (
            <View style={styles.chatItemGrid}>
              <View style={styles.leftContainer}>
                <View style={styles.titleRow}>
                  <Typography
                    style={[styles.chatTitle, styles.gridText]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    text={title}
                  />
                </View>
                <View style={styles.subtitleRow}>{subtitleNode}</View>
              </View>

              <View style={styles.rightContainer}>
                <View style={styles.dateRow}>{dateNode}</View>

                <View style={styles.badgeRow}>
                  {isPinned && <Icon name={"PinIcon"} size={16} />}
                  {unreadCount > 0 && (
                    <View style={styles.ball}>
                      <Typography style={styles.ballText} text={unreadCount.toString()} />
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </HoverAndPressedButton>
      </View>
    );
  },
);

function createStyle(theme: any) {
  return StyleSheet.create({
    chatItem: {
      borderRadius: 100,
      height: 60,
    },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 10,
      paddingRight: 15,
      width: "100%",
      flex: 1,
      borderRadius: 100,
      gap: 10,
    },
    avatarWrapper: {
      marginRight: 10,
    },
    avatarWrapperCollapsed: {
      marginRight: 0,
      position: "relative",
    },
    collapsedUnreadBadge: {
      position: "absolute",
      top: -2,
      right: -4,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 4,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.badgeColor,
    },
    chatTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
    },
    chatItemGrid: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "space-between",
    },
    gridText: {
      fontSize: 14,
      color: theme.text,
    },
    ball: {
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.badgeColor,
    },
    ballText: {
      textAlign: "center",
      color: theme.text,
      fontSize: 12,
    },
    selectionIndicator: {
      position: "absolute",
      top: 5,
      left: 5,
      zIndex: 10,
      backgroundColor: theme.backgroundSuccess,
      borderRadius: 999,
    },
    leftContainer: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "center",
      overflow: "hidden",
    },
    titleRow: {
      height: 22,
      justifyContent: "center",
    },
    subtitleRow: {
      height: 20,
      justifyContent: "center",
    },
    rightContainer: {
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "center",
      minWidth: 50,
    },
    dateRow: {
      height: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 3,
    },
    badgeRow: {
      height: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 5,
    },
  });
}

export default BaseListItem;
