import { useMemo } from "react";
import { View, StyleSheet } from "react-native";

import { DateTime } from "luxon";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import { Theme } from "@/src/context/ThemeContext";
import DateYearGrid from "./DateYearGrid";
import {
  isDaySelected,
  isSameDay,
  monthGrid,
  rangeRole,
  weekdayLabels,
  type IsoDateRange,
} from "../../../../utils/dateTimeInput";

type DateCalendarProps = {
  visibleMonth: DateTime;
  onVisibleMonthChange: (month: DateTime) => void;
  minDate: DateTime;
  maxDate: DateTime;
  dates: string[];
  ranges: IsoDateRange[];
  pendingStart: string | null;
  onDayPress: (dayKey: string) => void;
  locale: string;
  theme: Theme;
  pickingYear: boolean;
  onPickingYearChange: (picking: boolean) => void;
};

const DateCalendar = ({
  visibleMonth,
  onVisibleMonthChange,
  minDate,
  maxDate,
  dates,
  ranges,
  pendingStart,
  onDayPress,
  locale,
  theme,
  pickingYear,
  onPickingYearChange,
}: DateCalendarProps) => {
  const styles = createStyles();
  const days = useMemo(
    () => monthGrid(visibleMonth, locale),
    [visibleMonth, locale],
  );
  const labels = useMemo(() => weekdayLabels(locale), [locale]);
  const today = DateTime.now();
  const minMonth = minDate.startOf("month");
  const maxMonth = maxDate.startOf("month");
  const canGoPrev = visibleMonth.startOf("month") > minMonth;
  const canGoNext = visibleMonth.startOf("month") < maxMonth;

  const selectYear = (year: number) => {
    let next = visibleMonth.set({ year }).startOf("month");
    if (next < minMonth) next = minMonth;
    if (next > maxMonth) next = maxMonth;
    onVisibleMonthChange(next);
    onPickingYearChange(false);
  };

  const weeks = useMemo(() => {
    const rows: DateTime[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [days]);

  return (
    <View>
      <View style={styles.monthRow}>
        {!pickingYear ? (
          <Icon
            name="ArrowLeft02Icon"
            onPress={
              canGoPrev
                ? () => onVisibleMonthChange(visibleMonth.minus({ months: 1 }))
                : undefined
            }
          />
        ) : (
          <View style={styles.monthSide} />
        )}
        <HoverAndPressedButton
          onPress={() => onPickingYearChange(!pickingYear)}
          style={styles.monthTitle}
          hoveredStyle={{ backgroundColor: theme.iconHovered }}
        >
          <Typography
            weight="semibold"
            text={visibleMonth.setLocale(locale).toFormat("LLLL yyyy")}
          />
        </HoverAndPressedButton>
        {!pickingYear ? (
          <Icon
            name="ArrowRight02Icon"
            onPress={
              canGoNext
                ? () => onVisibleMonthChange(visibleMonth.plus({ months: 1 }))
                : undefined
            }
          />
        ) : (
          <View style={styles.monthSide} />
        )}
      </View>

      {pickingYear ? (
        <DateYearGrid
          selectedYear={visibleMonth.year}
          minDate={minDate}
          maxDate={maxDate}
          onSelectYear={selectYear}
          theme={theme}
        />
      ) : (
        <>
          <View style={styles.weekRow}>
            {labels.map((label) => (
              <View key={label} style={styles.weekCell}>
                <Typography size="xs" variant="subtitle" text={label} />
              </View>
            ))}
          </View>

          <View>
            {weeks.map((week) => (
              <View key={week[0].toISODate()} style={styles.weekDays}>
                {week.map((day) => {
                  const dayKey = day.toISODate() ?? "";
                  const inMonth = day.hasSame(visibleMonth, "month");
                  const disabled =
                    day < minDate.startOf("day") || day > maxDate.endOf("day");
                  const selected = isDaySelected(dayKey, dates, ranges);
                  const role = rangeRole(dayKey, ranges);
                  const isPending = pendingStart === dayKey;
                  const isToday = isSameDay(day, today);

                  return (
                    <View key={dayKey} style={styles.dayWrap}>
                      <HoverAndPressedButton
                        disabled={disabled || !inMonth}
                        onPress={() => onDayPress(dayKey)}
                        style={[
                          styles.dayCell,
                          role === "middle" && {
                            backgroundColor: theme.primary + "33",
                          },
                          (selected && role !== "middle") || isPending
                            ? { backgroundColor: theme.primary }
                            : null,
                          isPending && !selected
                            ? { borderWidth: 2, borderColor: theme.primary }
                            : null,
                        ]}
                        hoveredStyle={{ backgroundColor: theme.iconHovered }}
                      >
                        <Typography
                          size="sm"
                          weight={selected || isToday ? "semibold" : "regular"}
                          variant={
                            disabled || !inMonth
                              ? "subtitle"
                              : selected || isPending
                                ? "default"
                                : isToday
                                  ? "primary"
                                  : "default"
                          }
                          text={String(day.day)}
                          accessibilityLabel={day.toFormat("dd/MM/yyyy")}
                        />
                      </HoverAndPressedButton>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    monthTitle: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 25,
    },
    monthSide: {
      width: 40,
    },
    weekRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    weekCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 4,
    },
    weekDays: {
      flexDirection: "row",
      alignItems: "center",
    },
    dayWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 2,
    },
    dayCell: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      padding: 0,
    },
  });

export default DateCalendar;
