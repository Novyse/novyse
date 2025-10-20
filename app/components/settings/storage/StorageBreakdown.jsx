import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/app/components/Icon";

const StorageBreakdown = ({ storage }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const getSegmentWidths = (categories, totalUsed) => {
    return categories.map((cat) => ({
      ...cat,
      percentage: ((cat.size / totalUsed) * 100).toFixed(1),
    }));
  };

  const segments = getSegmentWidths(storage.categories, storage.totalUsed);
  const barWidth = storage.totalCapacity
    ? `${(storage.totalUsed / storage.totalCapacity) * 100}%`
    : "100%";

  return (
    <View style={styles.container}>
      <View style={styles.storageLabelRow}>
        <View style={styles.storageLabelLeft}>
          <View style={styles.iconContainer}>
            <Icon
              name={storage.iconName}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.storageTitle}>{storage.title}</Text>
        </View>
        <View style={styles.storageRight}>
          <Text style={styles.storageStat}>
            {storage.totalUsed}{" "}
            {storage.totalCapacity ? `/ ${storage.totalCapacity}` : ""} GB
          </Text>
        </View>
      </View>

      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarInner, { width: barWidth }]}>
          {segments.map((segment) => (
            <View
              key={segment.name}
              style={[
                styles.progressSegment,
                {
                  width: `${segment.percentage}%`,
                  backgroundColor: segment.color,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        {storage.categories.map((category, catIndex) => {
          const percentage = segments[catIndex].percentage;

          return (
            <View key={category.name} style={styles.categoryItem}>
              <View style={styles.categoryLeft}>
                <View
                  style={[styles.colorDot, { backgroundColor: category.color }]}
                />
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categorySize}>{category.size} GB</Text>
                <Text style={styles.categoryPercentage}>{percentage}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const createStyle = (theme = {}) => {
  return StyleSheet.create({
    container: {
      width: "100%",
    },
    storageLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    storageLabelLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme?.primary || "#007AFF",
      alignItems: "center",
      justifyContent: "center",
    },
    storageTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme?.text,
      letterSpacing: -0.2,
    },
    storageRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    storageStat: {
      fontSize: 14,
      fontWeight: "600",
      color: theme?.textSecondary || theme?.text,
    },
    progressBarOuter: {
      height: 16,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme?.surfaceSecondary || "#F3F4F6",
      marginBottom: 16,
    },
    progressBarInner: {
      height: "100%",
      flexDirection: "row",
      borderRadius: 10,
      overflow: "hidden",
    },
    progressSegment: {
      height: "100%",
    },
    categoriesContainer: {
      gap: 2,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: 8,
    },
    categoryLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    categoryRight: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 10,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 12,
    },
    categoryName: {
      fontSize: 15,
      fontWeight: "500",
      color: theme?.text,
    },
    categorySize: {
      fontSize: 15,
      fontWeight: "600",
      color: theme?.text,
    },
    categoryPercentage: {
      fontSize: 13,
      fontWeight: "500",
      minWidth: 45,
      textAlign: "right",
      color: theme?.textSecondary || theme?.text,
      opacity: 0.7,
    },
  });
};

export default StorageBreakdown;