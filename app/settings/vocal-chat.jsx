import React, { useContext, useState } from "react";
import { StyleSheet, View, Text, Switch } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";

const VocalChatPage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isNoiseReductionEnabled, setIsNoiseReductionEnabled] = useState(false);

  // Funzione per gestire il cambio di stato dello switch
  const toggleSwitch = () =>
    setIsNoiseReductionEnabled((previousState) => !previousState);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="./" />
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Riduzione rumore</Text>
          <Switch
            trackColor={{ false: "#767577", true: theme.primary || "#81b0ff" }} // Colore della traccia
            thumbColor={
              isNoiseReductionEnabled ? theme.accent || "#f5dd4b" : "#f4f3f4"
            } // Colore del cursore
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch} // Funzione chiamata al cambio di valore
            value={isNoiseReductionEnabled} // Valore corrente dello switch (legato allo stato)
          />
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
    switchContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between", // Spazio tra l'etichetta e lo switch
      paddingVertical: 15,
      paddingHorizontal: 10,
      marginVertical: 10,
      backgroundColor: theme.cardBackground || "gray", // Un colore di sfondo per il contenitore
      borderRadius: 10,
    },
    label: {
      color: theme.text,
      fontSize: 16,
    },
  });

export default VocalChatPage;
