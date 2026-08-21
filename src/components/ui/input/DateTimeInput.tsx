import { useContext, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import Typography from "@/src/components/ui/typography/Typography";
import Label from "@/src/components/ui/label/Label";
import { ThemeContext } from "@/src/context/ThemeContext";
import DatePickerModal from "../../features/input/date/DatePickerModal";
import {
  clampDateTime,
  defaultMaxDate,
  defaultMinDate,
  formatDisplayValue,
  parseDateTime,
  type DateTimeInputMode,
  type DateTimeInputSelection,
  type DateTimeInputValue,
} from "../../../utils/dateTimeInput";

export type {
  DateTimeInputMode,
  DateTimeInputMultipleValue,
  DateTimeInputSelection,
  DateTimeInputValue,
  IsoDateRange,
} from "../../../utils/dateTimeInput";

export type DateTimeInputProps = {
  /**
   * Current value.
   * - `single`: ISO `yyyy-MM-dd`, `HH:mm`, or `yyyy-MM-dd'T'HH:mm`
   * - `range`: `{ start, end }` with the same ISO shapes
   * - `multiple`: `{ dates: string[], ranges: { start, end }[] }`
   */
  value?: DateTimeInputValue;
  /** Called with ISO value(s), or `null` when cleared. */
  onChange?: (value: DateTimeInputValue | null) => void;
  /**
   * What the user edits in the modal.
   * @default "date"
   */
  mode?: DateTimeInputMode;
  /**
   * How days are accumulated on the calendar.
   * `multiple`: tap once to start, tap same day to pin a single day,
   * tap another day to add a range; tap a selected day to remove it (ranges split).
   * @default "single"
   */
  selection?: DateTimeInputSelection;
  /** Inclusive lower bound. Default: 150 years ago. ISO or Luxon-parseable. */
  minDate?: string;
  /** Inclusive upper bound. Default: 100 years from now. ISO or Luxon-parseable. */
  maxDate?: string;
  /** Field placeholder translation key. */
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  labelTranslationKey?: string;
  /** AdaptiveModal title translation key. */
  titleKey?: string;
};

export default function DateTimeInput({
  value,
  onChange,
  mode = "date",
  selection = "single",
  minDate,
  maxDate,
  placeholder,
  disabled = false,
  label,
  labelTranslationKey,
  titleKey,
}: DateTimeInputProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme, disabled);
  const [open, setOpen] = useState(false);

  const min = useMemo(() => {
    const parsed = parseDateTime(minDate);
    return clampDateTime(
      parsed ?? defaultMinDate(),
      defaultMinDate(),
      defaultMaxDate(),
    );
  }, [minDate]);

  const max = useMemo(() => {
    const parsed = parseDateTime(maxDate);
    return clampDateTime(
      parsed ?? defaultMaxDate(),
      defaultMinDate(),
      defaultMaxDate(),
    );
  }, [maxDate]);

  const emptyKey =
    placeholder ||
    (mode === "time"
      ? "common.inputs.select_time"
      : mode === "datetime"
        ? "common.inputs.select_datetime"
        : selection === "range"
          ? "common.inputs.select_date_range"
          : selection === "multiple"
            ? "common.inputs.select_dates"
            : "common.inputs.select_date");

  const display = formatDisplayValue(value, mode, i18n.language, {
    empty: t(emptyKey),
  });
  const isEmpty =
    value == null ||
    value === "" ||
    (typeof value === "object" &&
      "dates" in value &&
      value.dates.length === 0 &&
      value.ranges.length === 0) ||
    (typeof value === "object" &&
      "start" in value &&
      !("dates" in value) &&
      !value.start);

  const field = (
    <View style={styles.inputContainer}>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.pressable}
        disabled={disabled}
      >
        <Typography
          variant={isEmpty ? "subtitle" : "default"}
          size="sm"
          text={
            selection === "multiple" && !isEmpty
              ? t("common.inputs.selectedCount", { count: display })
              : display
          }
        />
      </Pressable>
    </View>
  );

  return (
    <View>
      {label || labelTranslationKey ? (
        <Label text={label} translationKey={labelTranslationKey} />
      ) : null}
      {field}
      <DatePickerModal
        visible={open}
        onClose={() => setOpen(false)}
        theme={theme}
        mode={mode}
        selection={selection}
        value={value}
        minDate={min}
        maxDate={max}
        onConfirm={(next) => onChange?.(next)}
        titleKey={titleKey}
      />
    </View>
  );
}

const createStyles = (theme: any, disabled: boolean) =>
  StyleSheet.create({
    inputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 99,
      backgroundColor: theme.backgroundCard,
      opacity: disabled ? 0.6 : 1,
    },
    pressable: {
      flex: 1,
    },
  });

