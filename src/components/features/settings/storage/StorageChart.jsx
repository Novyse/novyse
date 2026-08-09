import { useContext, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

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
                <Icon name={storage.iconName} size={20} />
              </View>
              <Typography
                translationKey={`settings.storage.${storage.type === "local" ? "localStorage" : "cloudStorage"}`}
              />
            </View>
            <View style={styles.storageRight}>
              <Typography>
                {storage.totalUsed}{" "}
                {storage.totalCapacity ? `/ ${storage.totalCapacity}` : ""} GB
              </Typography>
              <Icon
                name={isExpanded ? "ArrowUp01Icon" : "ArrowDown01Icon"}
                size={20}
                color={theme.textSecondary || theme.text}
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
              const segments = getSegmentWidths(
                storage.categories,
                storage.totalUsed,
              );
              const percentage = segments[catIndex].percentage;

              return (
                <View key={category.name} style={styles.categoryItem}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: category.color },
                      ]}
                    />
                    <Typography
                      translationKey={`settings.storage.${category.name.toLowerCase()}`}
                    />
                  </View>
                  <View style={styles.categoryRight}>
                    <Typography>{category.size} GB</Typography>
                    <Typography>{percentage}%</Typography>
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
      width: 35,
      height: 35,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    storageRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    chevronIcon: {
      marginLeft: 4,
    },
    progressBarOuter: {
      height: 16,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme.primary,
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
  });
};

export default StorageBreakdownChart;
