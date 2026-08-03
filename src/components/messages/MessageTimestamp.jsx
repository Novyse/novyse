import React, { useContext, useState, useRef } from "react";
import { StyleSheet, View, Platform } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { createPortal } from "react-dom";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";
import { DateTime } from "luxon";

const MessageTimestamp = ({
  time,
  sent = false,
  receivedByAll = false,
  isEdited = false,
  isPendingEdit = false,
  isPinned = false,
  replyCount = 0,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const timeRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const autoHideTimeoutRef = useRef(null);

  const parseTime = (dateTime) => {
    if (!dateTime) return "";
    const dt = DateTime.fromISO(dateTime, { zone: "utc" }).toLocal();
    return dt.isValid ? dt.toFormat("HH:mm") : "";
  };

  const parseFullTime = (dateTime) => {
    if (!dateTime) return "";
    const dt = DateTime.fromISO(dateTime, { zone: "utc" }).toLocal();
    return dt.isValid ? dt.toFormat("EEEE dd MMMM HH:mm:ss") : "";
  };

  const handleMouseEnter = () => {
    if (timeRef.current) {
      timeRef.current.measureInWindow((x, y, width, height) => {
        setTooltipPosition({ top: y - 50, left: x + width / 2 - 175 });
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(true);
          autoHideTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
          }, 5000);
        }, 500);
      });
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
    setIsHovered(false);
  };

  if (!isPendingEdit && parseTime(time) === "") {
    return (
      <View style={styles.alignContainer}>
        {(isEdited || isPendingEdit) && (
          <Icon name={"PencilEdit02Icon"} size={14} color={theme.subtitle} />
        )}
        {replyCount > 0 && (
          <Icon name={"ArrowMoveUpLeftIcon"} size={14} color={theme.subtitle} />
        )}
        <Icon name={"Clock01Icon"} size={14} color={theme.subtitle} />
      </View>
    );
  }

  const tooltip =
    Platform.OS === "web" && isHovered && !isPendingEdit ? (
      <View
        style={[
          styles.tooltip,
          { top: tooltipPosition.top, left: tooltipPosition.left },
        ]}
      >
        <AppText style={styles.tooltipText} text={parseFullTime(time)} />
      </View>
    ) : null;

  return (
    <View style={styles.alignContainer}>
      <View style={styles.iconContainer}>
        {isPinned && <Icon name={"PinIcon"} size={14} color={theme.subtitle} />}
        {(isEdited || isPendingEdit) && (
          <Icon name={"PencilEdit02Icon"} size={14} color={theme.subtitle} />
        )}
        {isPendingEdit && (
          <Icon name={"Clock01Icon"} size={14} color={theme.subtitle} />
        )}
        {sent && !receivedByAll && !isPendingEdit && (
          <Icon name={"Tick01Icon"} size={14} color={theme.subtitle} />
        )}
        {receivedByAll && !isPendingEdit && (
          <Icon name={"TickDouble01Icon"} size={14} color={theme.subtitle} />
        )}
        {replyCount > 0 && !isPendingEdit && (
          <>
            <Icon
              name={"ArrowMoveUpLeftIcon"}
              size={14}
              color={theme.subtitle}
            />
            <AppText style={styles.replyCountText} text={String(replyCount)} />
          </>
        )}
      </View>
      {!isPendingEdit &&
        (Platform.OS === "web" ? (
          <View
            ref={timeRef}
            style={styles.timeContainer}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <AppText style={styles.timeText} text={parseTime(time)} />
          </View>
        ) : (
          <View style={styles.timeContainer}>
            <AppText style={styles.timeText} text={parseTime(time)} />
          </View>
        ))}
      {Platform.OS === "web" && createPortal(tooltip, document.body)}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    timeText: {
      color: theme.subtitle,
      textAlign: "right",
      fontSize: 12,
      minWidth: 35,
    },
    replyCountText: {
      color: theme.subtitle,
      textAlign: "right",
      fontSize: 12,
      paddingLeft: 2,
    },
    alignContainer: {
      alignSelf: "flex-end",
      marginLeft: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    timeContainer: {
      position: "relative",
    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    tooltip: {
      position: "fixed",
      backgroundColor: theme.backgroundModalOverlay,
      padding: 10,
      borderRadius: 5,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 5,
      elevation: 5,
      zIndex: 1000,
      minWidth: 150,
    },
    tooltipText: {
      color: theme.text,
      fontSize: 12,
      textAlign: "center",
    },
  });

export default MessageTimestamp;
