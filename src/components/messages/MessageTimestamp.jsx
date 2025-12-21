import React, { useContext } from "react";
import { Text, StyleSheet, View } from "react-native";
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

  if (parseTime(time) === "") {
    return (
      <View style={styles.alignContainer}>
        <Icon name={"Clock01Icon"} size={14} />
      </View>
    );
  }

  return (
    <View style={styles.alignContainer}>
      <Text style={styles.timeText} selectable={false}>
        {parseTime(time)}
      </Text>
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
    },
    alignContainer: {
      alignSelf: "flex-end",
      marginLeft: 10,
    },
  });

export default MessageTimestamp;
