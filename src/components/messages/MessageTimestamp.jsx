import { useContext, useState, useRef } from "react";
import { StyleSheet, View, Platform } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
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
  /** Tighter padding when meta sits inline with text (float / flow). */
  compact = false,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, compact);
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
        <Typography size="xs" text={parseFullTime(time)} />
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
            <Typography
              size="xs"
              variant="subtitle"
              text={String(replyCount)}
            />
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
            <Typography size="xs" variant="subtitle" text={parseTime(time)} />
          </View>
        ) : (
          <View style={styles.timeContainer}>
            <Typography size="xs" variant="subtitle" text={parseTime(time)} />
          </View>
        ))}
      {Platform.OS === "web" && createPortal(tooltip, document.body)}
    </View>
  );
};

const createStyle = (theme, compact) =>
  StyleSheet.create({
    alignContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: compact ? 0 : 10,
      paddingVertical: compact ? 0 : 10,
      gap: compact ? 3 : 5,
    },
    timeContainer: {
      position: "relative",
    },
    iconContainer: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: compact ? 1 : 2,
    },
    tooltip: {
      position: "fixed",
      backgroundColor: theme.backgroundModalOverlay,
      padding: 10,
      borderRadius: 25,
      zIndex: 1000,
      minWidth: 150,
    },
  });

export default MessageTimestamp;
