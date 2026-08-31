import { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

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
            <Icon name={storage.iconName} size={20} />
          </View>
          <Typography
            translationKey={`settings.storage.${storage.type === "local" ? "localStorage" : "cloudStorage"}`}
          />
        </View>
        <View style={styles.storageRight}>
          <Typography
            text={`${storage.totalUsed} ${storage.totalCapacity ? `/ ${storage.totalCapacity}` : ""} GB`}
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

      <View style={styles.categoriesContainer}>
        {storage.categories.map((category, catIndex) => {
          const percentage = segments[catIndex].percentage;

          return (
            <View key={category.name} style={styles.categoryItem}>
              <View style={styles.categoryLeft}>
                <View
                  style={[styles.colorDot, { backgroundColor: category.color }]}
                />
                <Typography
                  translationKey={`settings.storage.${category.name.toLowerCase()}`}
                  text={category.name}
                />
              </View>
              <View style={styles.categoryRight}>
                <Typography text={`${category.size} GB`} />
                <Typography text={`${percentage}%`} />
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
    progressBarOuter: {
      height: 16,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme.primary,
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
  });
};

export default StorageBreakdown;
