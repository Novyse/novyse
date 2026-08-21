import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Button from "@/src/components/ui/button/Button";
import SegmentedSwitch from "@/src/components/ui/switch/SegmentedSwitch";
import Typography from "@/src/components/ui/typography/Typography";
import { Theme } from "@/src/context/ThemeContext";
import DateCalendar from "./DateCalendar";
import TimeField from "./TimeField";
import {
  addDateRange,
  addSingleDay,
  commitDraft,
  draftFromValue,
  emptyDraft,
  emptyMultiple,
  isDaySelected,
  normalizeMultiple,
  parseDateTime,
  removeDay,
  type DateDraft,
  type DateTimeInputMode,
  type DateTimeInputSelection,
  type DateTimeInputValue,
} from "../../../../utils/dateTimeInput";

type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  mode: DateTimeInputMode;
  selection: DateTimeInputSelection;
  value?: DateTimeInputValue;
  minDate: DateTime;
  maxDate: DateTime;
  onConfirm: (value: DateTimeInputValue | null) => void;
  titleKey?: string;
};

const DatePickerModal = ({
  visible,
  onClose,
  theme,
  mode,
  selection,
  value,
  minDate,
  maxDate,
  onConfirm,
  titleKey,
}: DatePickerModalProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const styles = createStyles();

  const [draft, setDraft] = useState<DateDraft>(emptyDraft);
  const [visibleMonth, setVisibleMonth] = useState(() => DateTime.now());
  const [panel, setPanel] = useState<"date" | "time">("date");
  const [pickingYear, setPickingYear] = useState(false);

  const showCalendar = mode === "date" || mode === "datetime";
  const showTime = mode === "time" || mode === "datetime";

  useEffect(() => {
    if (!visible) return;
    const next = draftFromValue(value, selection, mode);
    setDraft(next);
    const first =
      parseDateTime(next.dates[0]) ??
      parseDateTime(next.ranges[0]?.start) ??
      DateTime.now();
    setVisibleMonth(first.startOf("month"));
    setPanel(mode === "time" ? "time" : "date");
    setPickingYear(false);
  }, [visible, value, selection, mode]);

  const handleDayPress = (dayKey: string) => {
    setDraft((current) => {
      if (selection === "single") {
        return { ...current, dates: [dayKey], ranges: [], pendingStart: null };
      }

      if (selection === "range") {
        if (!current.pendingStart) {
          return { ...current, dates: [], ranges: [], pendingStart: dayKey };
        }
        const next = addDateRange(
          current.pendingStart,
          dayKey,
          [],
          [],
        );
        return { ...current, ...next, pendingStart: null };
      }

      if (isDaySelected(dayKey, current.dates, current.ranges)) {
        const stripped = removeDay(dayKey, current.dates, current.ranges);
        return { ...current, ...stripped, pendingStart: null };
      }

      if (!current.pendingStart) {
        return { ...current, pendingStart: dayKey };
      }

      if (current.pendingStart === dayKey) {
        const next = addSingleDay(dayKey, current.dates, current.ranges);
        return { ...current, ...next, pendingStart: null };
      }

      const next = addDateRange(
        current.pendingStart,
        dayKey,
        current.dates,
        current.ranges,
      );
      return { ...current, ...next, pendingStart: null };
    });
  };

  const title = titleKey ?? (
    mode === "time"
      ? "common.inputs.select_time"
      : mode === "datetime"
        ? "common.inputs.select_datetime"
        : selection === "range"
          ? "common.inputs.select_date_range"
          : selection === "multiple"
            ? "common.inputs.select_dates"
            : "common.inputs.select_date"
  );

  const canConfirm = useMemo(() => {
    if (mode === "time") return true;
    const normalized = normalizeMultiple(draft.dates, draft.ranges);
    if (selection === "single") {
      return normalized.dates.length > 0 || normalized.ranges.length > 0;
    }
    if (selection === "range") {
      return normalized.ranges.length > 0 || normalized.dates.length > 0;
    }
    return (
      normalized.dates.length > 0 ||
      normalized.ranges.length > 0 ||
      !!draft.pendingStart
    );
  }, [draft, mode, selection]);

  const handleConfirm = () => {
    let nextDraft = draft;
    if (selection === "multiple" && draft.pendingStart) {
      const next = addSingleDay(draft.pendingStart, draft.dates, draft.ranges);
      nextDraft = { ...draft, ...next, pendingStart: null };
    }
    if (selection === "range" && draft.pendingStart && draft.ranges.length === 0) {
      nextDraft = {
        ...draft,
        ...addSingleDay(draft.pendingStart, [], []),
        pendingStart: null,
      };
    }
    onConfirm(commitDraft(nextDraft, selection, mode));
    onClose();
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      snapPoints={["75%"]}
      titleTranslationKey={title}
      scrollable={!pickingYear}
    >
      <View style={styles.body}>
        {mode === "datetime" ? (
          <SegmentedSwitch
            options={[
              { value: "date", label: t("common.inputs.tab_date") },
              { value: "time", label: t("common.inputs.tab_time") },
            ]}
            value={panel}
            onChange={setPanel}
          />
        ) : null}

        {showCalendar && (mode !== "datetime" || panel === "date") ? (
          <DateCalendar
            visibleMonth={visibleMonth}
            onVisibleMonthChange={setVisibleMonth}
            minDate={minDate}
            maxDate={maxDate}
            dates={draft.dates}
            ranges={
              selection === "range" && draft.pendingStart
                ? draft.ranges
                : draft.ranges
            }
            pendingStart={draft.pendingStart}
            onDayPress={handleDayPress}
            locale={locale}
            theme={theme}
            pickingYear={pickingYear}
            onPickingYearChange={setPickingYear}
          />
        ) : null}

        {showTime && (mode !== "datetime" || panel === "time") ? (
          <View style={styles.timeBlock}>
            <TimeField
              theme={theme}
              value={draft.time}
              onChange={(time) => setDraft((d) => ({ ...d, time }))}
              labelKey={
                selection === "range" ? "common.inputs.from" : undefined
              }
            />
            {selection === "range" ? (
              <TimeField
                theme={theme}
                value={draft.endTime}
                onChange={(endTime) => setDraft((d) => ({ ...d, endTime }))}
                labelKey="common.inputs.to"
              />
            ) : null}
          </View>
        ) : null}

        {selection === "multiple" ? (
          <Typography
            size="sm"
            variant="subtitle"
            translationKey="common.inputs.multipleHint"
          />
        ) : null}

        <View style={styles.actions}>
          <Button
            translationKey="common.inputs.clear"
            onPress={() => {
              onConfirm(
                selection === "multiple"
                  ? emptyMultiple()
                  : selection === "range"
                    ? { start: "", end: "" }
                    : "",
              );
              onClose();
            }}
          />
          <Button
            translationKey="common.inputs.confirm"
            onPress={handleConfirm}
            disabled={!canConfirm}
          />
        </View>
      </View>
    </AdaptiveModal>
  );
};

const createStyles = () =>
  StyleSheet.create({
    body: {
      gap: 16,
    },
    timeBlock: {
      gap: 16,
      alignItems: "center",
      paddingVertical: 8,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
    },
  });

export default DatePickerModal;
