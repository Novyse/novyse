import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "../../Icon";

const StorageBreakdownChart = () => {
  const { theme } = useContext(ThemeContext);
  const [expandedStorage, setExpandedStorage] = useState(null);

  const styles = createStyle(theme);

  const storageData = [
    {
      type: "cloud",
      title: "Cloud Storage",
      iconName: "CloudIcon",
      totalUsed: 10,
      totalCapacity: 15,
      categories: [
        { name: "Videos", size: 1, color: "#007AFF" },
        { name: "Images", size: 2, color: "#A855F7" },
        { name: "Documents", size: 3, color: "#10B981" },
        { name: "Others", size: 4, color: "#F59E0B" },
      ],
    },
    {
      type: "local",
      title: "Local Storage",
      iconName: "Database02Icon",
      totalUsed: 2.3,
      totalCapacity: null,
      categories: [
        { name: "Media", size: 1.15, color: "#0EA5E9" },
        { name: "Stickers", size: 0.69, color: "#F97316" },
        { name: "Cache", size: 0.46, color: "#EC4899" },
      ],
    },
  ];

  const getSegmentWidths = (categories, totalUsed) => {
    return categories.map((cat) => ({
      ...cat,
      percentage: ((cat.size / totalUsed) * 100).toFixed(1),
    }));
  };

  const toggleExpand = (storageType) => {
    setExpandedStorage(expandedStorage === storageType ? null : storageType);
  };

  const renderProgressBar = (storage) => {
    const segments = getSegmentWidths(storage.categories, storage.totalUsed);
    const barWidth = storage.totalCapacity
      ? `${(storage.totalUsed / storage.totalCapacity) * 100}%`
      : "100%";
    const isExpanded = expandedStorage === storage.type;

    return (
      <View style={styles.storageCard}>
        <TouchableOpacity 
          onPress={() => toggleExpand(storage.type)}
          activeOpacity={0.7}
        >
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
              <Icon
                name={isExpanded ? "ArrowUp01Icon" : "ArrowDown01Icon"}
                size={20}
                color={theme?.textSecondary || theme?.text}
                style={styles.chevronIcon}
              />
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
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.categoriesContainer}>
            {storage.categories.map((category, catIndex) => {
              const segments = getSegmentWidths(storage.categories, storage.totalUsed);
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
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {storageData.map((storage) => renderProgressBar(storage))}
    </View>
  );
};

const createStyle = (theme = {}) => {
  return StyleSheet.create({
    container: {
      width: "100%",
      gap: 12,
    },
    storageCard: {
      borderRadius: 16,
      padding: 16,
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
    chevronIcon: {
      marginLeft: 4,
    },
    progressBarOuter: {
      height: 16,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme?.surfaceSecondary || "#F3F4F6",
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
      marginTop: 16,
      paddingTop: 16,
      gap: 2,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 4,
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

export default StorageBreakdownChart;