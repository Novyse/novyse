import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";

const Info = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="../" />
        
        <View style={styles.content}>
          <Text style={styles.text}>Magna cosa ci vuoi mettere qui</Text>
        </View>
      </View>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    text: {
      color: theme.text,
      fontSize: 18,
      textAlign: "center",
      fontWeight: "500",
    },
  });

  export default Info;