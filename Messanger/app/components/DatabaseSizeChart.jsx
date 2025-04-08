import React, { useContext, useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { PieChart } from "react-native-svg-charts";
import localDatabase from "../utils/localDatabaseMethods";

const DatabaseSizeChart = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();
  const [storageData, setStorageData] = useState({
    total: 0,
    breakdown: [
      { key: "Database (Altro)", value: 0, svg: { fill: "#8884d8" } },
      { key: "Messaggi", value: 0, svg: { fill: "#82ca9d" } },
    ],
  });

  const fetchStorageData = async () => {
    try {
      const totalSize = await localDatabase.getDatabaseSize();
      const messagesSize = await localDatabase.getMessagesSize();

      console.log("Total Size (Database):", totalSize);
      console.log("Messages Size:", messagesSize);

      const parsedTotalSize = parseFloat(totalSize);
      const parsedMessagesSize = parseFloat(messagesSize);
      const validTotalSize = isNaN(parsedTotalSize) ? 0 : parsedTotalSize;
      const validMessagesSize = isNaN(parsedMessagesSize) ? 0 : parsedMessagesSize;

      // "Altro" è la differenza tra il totale e i messaggi
      const otherSize = Math.max(0, validTotalSize - validMessagesSize);

      const breakdown = [
        { key: "Database (Altro)", value: otherSize, svg: { fill: "#8884d8" } },
        { key: "Messaggi", value: validMessagesSize, svg: { fill: "#82ca9d" } },
      ];
      console.log("Breakdown data for PieChart:", breakdown);

      setStorageData({
        total: validTotalSize,
        breakdown,
      });
    } catch (error) {
      console.error("Errore nel recupero della dimensione del database:", error);
      setStorageData({
        total: 0,
        breakdown: [
          { key: "Database (Altro)", value: 0, svg: { fill: "#8884d8" } },
          { key: "Messaggi", value: 0, svg: { fill: "#82ca9d" } },
        ],
      });
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <Text style={styles.title}>Spazio di Archiviazione</Text>
        <PieChart
          style={{ height: 250, width: 250 }}
          data={storageData.breakdown}
          innerRadius="87%"
          padAngle={0.03}
        />
        <Text style={styles.totalText}>
          Totale: {storageData.total.toFixed(2)} MB
        </Text>
        <View style={styles.legend}>
          {storageData.breakdown.map((item) => (
            <View key={item.key} style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: item.svg.fill }]}
              />
              <Text style={styles.legendText}>
                {item.key}: {item.value.toFixed(2)} MB
              </Text>
            </View>
          ))}
        </View>
      </View>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
    },
    backButton: {
      padding: 5,
    },
    chartContainer: {
      alignItems: "center",
      marginTop: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 20,
    },
    totalText: {
      fontSize: 16,
      color: theme.text,
      marginTop: 20,
    },
    legend: {
      marginTop: 20,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 5,
    },
    legendColor: {
      width: 15,
      height: 15,
      borderRadius: 3,
      marginRight: 10,
    },
    legendText: {
      color: theme.text,
      fontSize: 14,
    },
  });

export default DatabaseSizeChart;