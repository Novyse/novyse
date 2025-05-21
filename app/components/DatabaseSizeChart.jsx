import React, { useContext, useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import localDatabase from "../utils/localDatabaseMethods";

const DatabaseSizeChart = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  useEffect(() => {
    
  }, []);

  return (
    <View style={styles.container}>
      
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundClassic,
      padding: 10,
    },
  });

export default DatabaseSizeChart;