import React from "react";
import { View, StyleSheet } from "react-native";
import EmailCheckForm from "./EmailCheckForm";
import { ThemeContext } from "@/context/ThemeContext";
import { useContext } from "react";

const EmailCheck = () => {
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  
  return (
    <View style={styles.container}>
      <EmailCheckForm />
    </View>
  );
};

export default EmailCheck;

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#354966",
      justifyContent: "center",
      alignItems: "center",
    },
  });
}
