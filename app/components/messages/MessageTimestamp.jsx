
import React, { useContext } from "react";
import { Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "../Icon";
import moment from "moment";

const MessageTimestamp = ({ time }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const parseTime = (dateTime) => {
    if (!dateTime) return "";
    const timeMoment = moment(dateTime);
    return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
  };

  if (time === "") {
    return <Icon name={"Clock01Icon"} size={14} />;
  }

  return <Text style={styles.timeText}>{parseTime(time)}</Text>;
};

const createStyle = (theme) =>
  StyleSheet.create({
    timeText: {
      color: theme.textTime,
      fontSize: 12,
      marginLeft: 4,
      alignSelf: "flex-end",
      minWidth: 35,
      textAlign: "right",
    },
  });

export default MessageTimestamp;
