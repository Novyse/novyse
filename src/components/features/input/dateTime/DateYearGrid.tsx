import { useEffect, useMemo, useRef } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { DateTime } from "luxon";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import Typography from "@/src/components/ui/typography/Typography";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import { Theme } from "@/src/context/ThemeContext";

const YEAR_ROW_HEIGHT = 48;
const YearScroll = Platform.OS === "web" ? ScrollView : BottomSheetScrollView;

type DateYearGridProps = {
  selectedYear: number;
  minDate: DateTime;
  maxDate: DateTime;
  onSelectYear: (year: number) => void;
  theme: Theme;
};

const DateYearGrid = ({
  selectedYear,
  minDate,
  maxDate,
  onSelectYear,
  theme,
}: DateYearGridProps) => {
  const styles = createStyles();
  const scrollRef = useRef<ScrollView>(null);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = minDate.year; year <= maxDate.year; year++) {
      list.push(year);
    }
    return list;
  }, [minDate.year, maxDate.year]);

  useEffect(() => {
    const index = years.indexOf(selectedYear);
    if (index < 0) return;
    const row = Math.floor(index / 3);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: row * YEAR_ROW_HEIGHT, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedYear, years]);

  return (
    <YearScroll
      ref={scrollRef as any}
      style={styles.scroll}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        {years.map((year) => {
          const selected = year === selectedYear;
          return (
            <View key={year} style={styles.yearWrap}>
              <HoverAndPressedButton
                onPress={() => onSelectYear(year)}
                style={[
                  styles.yearCell,
                  selected && { backgroundColor: theme.primary },
                ]}
                hoveredStyle={{ backgroundColor: theme.iconHovered }}
              >
                <Typography
                  size="sm"
                  weight={selected ? "semibold" : "regular"}
                  text={String(year)}
                />
              </HoverAndPressedButton>
            </View>
          );
        })}
      </View>
    </YearScroll>
  );
};

const createStyles = () =>
  StyleSheet.create({
    scroll: {
      height: YEAR_ROW_HEIGHT * 7,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    yearWrap: {
      width: "33.33%",
      height: YEAR_ROW_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    yearCell: {
      width: 88,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      padding: 0,
    },
  });

export default DateYearGrid;
