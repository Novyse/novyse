import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import { Theme } from "@/src/context/ThemeContext";
import { parseDateTime, toTimeKey } from "../../../../utils/dateTimeInput";
import { DateTime } from "luxon";

type TimeFieldProps = {
  value: string;
  onChange: (next: string) => void;
  labelKey?: string;
  theme: Theme;
};

const pad = (n: number) => String(n).padStart(2, "0");

const stepTime = (value: string, unit: "hour" | "minute", delta: number) => {
  const parsed = parseDateTime(value) ?? DateTime.now();
  const next =
    unit === "hour"
      ? parsed.plus({ hours: delta })
      : parsed.plus({ minutes: delta });
  return toTimeKey(next);
};

const TimeColumn = ({
  label,
  display,
  onMinus,
  onPlus,
  theme,
}: {
  label: string;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
  theme: Theme;
}) => {
  const styles = createStyles(theme);
  return (
    <View style={styles.column}>
      <Icon name="ArrowUp01Icon" onPress={onPlus} />
      <View style={styles.valueBox}>
        <Typography size="xl" weight="semibold" text={display} />
        <Typography size="xs" variant="subtitle" text={label} />
      </View>
      <Icon name="ArrowDown01Icon" onPress={onMinus} />
    </View>
  );
};

const TimeField = ({ value, onChange, labelKey, theme }: TimeFieldProps) => {
  const parsed = parseDateTime(value) ?? DateTime.now();
  const styles = createStyles(theme);

  return (
    <View style={styles.wrap}>
      {labelKey ? (
        <Typography size="sm" weight="semibold" translationKey={labelKey} />
      ) : null}
      <View style={styles.row}>
        <TimeColumn
          theme={theme}
          label="HH"
          display={pad(parsed.hour)}
          onMinus={() => onChange(stepTime(value, "hour", -1))}
          onPlus={() => onChange(stepTime(value, "hour", 1))}
        />
        <Typography size="xl" weight="semibold" text=":" />
        <TimeColumn
          theme={theme}
          label="MM"
          display={pad(parsed.minute)}
          onMinus={() => onChange(stepTime(value, "minute", -1))}
          onPlus={() => onChange(stepTime(value, "minute", 1))}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: 8,
      alignItems: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    column: {
      alignItems: "center",
      gap: 4,
    },
    valueBox: {
      minWidth: 56,
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
  });

export default TimeField;
