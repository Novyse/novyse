import React, { useContext, useState, useRef } from "react";
import { Text, StyleSheet, View, Platform } from "react-native";
import { createPortal } from "react-dom";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "../Icon";
import { DateTime } from "luxon";

const MessageTimestamp = ({ time }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const timeRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const autoHideTimeoutRef = useRef(null);

  const parseTime = (dateTime) => {
    if (!dateTime) return "";
    const dt = DateTime.fromJSDate(new Date(dateTime));
    return dt.isValid ? dt.toFormat("HH:mm") : "";
  };

  const parseFullTime = (dateTime) => {
    if (!dateTime) return "";
    const dt = DateTime.fromJSDate(new Date(dateTime));
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

  if (parseTime(time) === "") {
    return (
      <View style={styles.alignContainer}>
        <Icon name={"Clock01Icon"} size={14} />
      </View>
    );
  }

  const tooltip =
    Platform.OS === "web" && isHovered ? (
      <View
        style={[
          styles.tooltip,
          { top: tooltipPosition.top, left: tooltipPosition.left },
        ]}
      >
        <Text style={styles.tooltipText}>{parseFullTime(time)}</Text>
      </View>
    ) : null;

  return (
    <View style={styles.alignContainer}>
      {Platform.OS === "web" ? (
        <View
          ref={timeRef}
          style={styles.timeContainer}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Text style={styles.timeText} selectable={false}>
            {parseTime(time)}
          </Text>
        </View>
      ) : (
        <View style={styles.timeContainer}>
          <Text style={styles.timeText} selectable={false}>
            {parseTime(time)}
          </Text>
        </View>
      )}
      {Platform.OS === "web" && createPortal(tooltip, document.body)}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    timeText: {
      color: theme.textTime,
      textAlign: "right",
      fontSize: 12,
      minWidth: 35,
      padding: 8
    },
    alignContainer: {
      alignSelf: "flex-end",
      marginLeft: 10,
    },
    timeContainer: {
      position: "relative",
    },
    tooltip: {
      position: "fixed",
      backgroundColor: theme.background || "#333",
      padding: 10,
      borderRadius: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
      minWidth: 150,
    },
    tooltipText: {
      color: theme.text || "#fff",
      fontSize: 12,
      textAlign: "center",
    },
  });

export default MessageTimestamp;
