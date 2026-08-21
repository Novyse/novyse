import { DateTime } from "luxon";

export const DATE_YEARS_PAST = 150;
export const DATE_YEARS_FUTURE = 100;

/** Calendar granularity: date only, time only, or both in one modal. */
export type DateTimeInputMode = "date" | "time" | "datetime";

/**
 * How values are picked on the calendar.
 * - `single`: one day (and optional time)
 * - `range`: one contiguous A→B span
 * - `multiple`: any mix of single days and several A→B spans
 */
export type DateTimeInputSelection = "single" | "range" | "multiple";

export type IsoDateRange = {
  start: string;
  end: string;
};

export type DateTimeInputMultipleValue = {
  dates: string[];
  ranges: IsoDateRange[];
};

export type DateTimeInputValue = string | IsoDateRange | DateTimeInputMultipleValue;

export type DateDraft = {
  dates: string[];
  ranges: IsoDateRange[];
  pendingStart: string | null;
  time: string;
  endTime: string;
};

export const defaultMinDate = (): DateTime =>
  DateTime.now().minus({ years: DATE_YEARS_PAST }).startOf("day");

export const defaultMaxDate = (): DateTime =>
  DateTime.now().plus({ years: DATE_YEARS_FUTURE }).endOf("day");

export const toDayKey = (dt: DateTime): string => dt.toISODate() ?? "";

export const toTimeKey = (dt: DateTime): string => dt.toFormat("HH:mm");

export const toDateTimeKey = (dt: DateTime): string =>
  dt.toFormat("yyyy-MM-dd'T'HH:mm");

export const parseDateTime = (
  raw?: string | null,
  locale?: string,
): DateTime | null => {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const zoneOpts = { locale };

  const iso = DateTime.fromISO(trimmed, zoneOpts);
  if (iso.isValid) return iso;

  const dateOnly = DateTime.fromFormat(trimmed, "dd/MM/yyyy", zoneOpts);
  if (dateOnly.isValid) return dateOnly;

  const timeOnly = DateTime.fromFormat(trimmed, "HH:mm", zoneOpts);
  if (timeOnly.isValid) return timeOnly;

  return null;
};

export const toIsoForMode = (dt: DateTime, mode: DateTimeInputMode): string => {
  if (mode === "time") return toTimeKey(dt);
  if (mode === "datetime") return toDateTimeKey(dt);
  return toDayKey(dt);
};

export const applyTime = (day: DateTime, timeHHmm: string): DateTime => {
  const parsed = parseDateTime(timeHHmm);
  if (!parsed) return day.startOf("day");
  return day.set({ hour: parsed.hour, minute: parsed.minute, second: 0 });
};

export const clampDateTime = (
  dt: DateTime,
  min: DateTime,
  max: DateTime,
): DateTime => {
  if (dt < min) return min;
  if (dt > max) return max;
  return dt;
};

export const isSameDay = (a: DateTime, b: DateTime): boolean =>
  a.hasSame(b, "day");

export const orderedRange = (a: string, b: string): IsoDateRange => {
  if (a <= b) return { start: a, end: b };
  return { start: b, end: a };
};

export const isDayInRange = (dayKey: string, range: IsoDateRange): boolean =>
  dayKey >= range.start && dayKey <= range.end;

export const isDaySelected = (
  dayKey: string,
  dates: string[],
  ranges: IsoDateRange[],
): boolean =>
  dates.includes(dayKey) || ranges.some((range) => isDayInRange(dayKey, range));

export const rangeRole = (
  dayKey: string,
  ranges: IsoDateRange[],
): "start" | "end" | "middle" | "single" | null => {
  for (const range of ranges) {
    if (!isDayInRange(dayKey, range)) continue;
    if (range.start === range.end) return "single";
    if (dayKey === range.start) return "start";
    if (dayKey === range.end) return "end";
    return "middle";
  }
  return null;
};

const dayPlus = (dayKey: string, days: number): string =>
  DateTime.fromISO(dayKey).plus({ days }).toISODate() ?? dayKey;

export const splitRangeOnDay = (
  range: IsoDateRange,
  dayKey: string,
): IsoDateRange[] => {
  if (!isDayInRange(dayKey, range)) return [range];
  if (range.start === range.end) return [];
  if (dayKey === range.start) {
    return [{ start: dayPlus(range.start, 1), end: range.end }];
  }
  if (dayKey === range.end) {
    return [{ start: range.start, end: dayPlus(range.end, -1) }];
  }
  return [
    { start: range.start, end: dayPlus(dayKey, -1) },
    { start: dayPlus(dayKey, 1), end: range.end },
  ];
};

export const mergeRanges = (ranges: IsoDateRange[]): IsoDateRange[] => {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  const merged: IsoDateRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    const lastEndNext = dayPlus(last.end, 1);
    if (current.start <= lastEndNext) {
      last.end = current.end > last.end ? current.end : last.end;
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
};

export const normalizeMultiple = (
  dates: string[],
  ranges: IsoDateRange[],
): DateTimeInputMultipleValue => {
  const merged = mergeRanges(ranges);
  const uniqueDates = [...new Set(dates)].filter(
    (day) => !merged.some((range) => isDayInRange(day, range)),
  );
  uniqueDates.sort();
  return { dates: uniqueDates, ranges: merged };
};

export const removeDay = (
  dayKey: string,
  dates: string[],
  ranges: IsoDateRange[],
): DateTimeInputMultipleValue => {
  const nextDates = dates.filter((day) => day !== dayKey);
  const nextRanges = ranges.flatMap((range) => splitRangeOnDay(range, dayKey));
  return normalizeMultiple(nextDates, nextRanges);
};

export const addSingleDay = (
  dayKey: string,
  dates: string[],
  ranges: IsoDateRange[],
): DateTimeInputMultipleValue =>
  normalizeMultiple([...dates, dayKey], ranges);

export const addDateRange = (
  start: string,
  end: string,
  dates: string[],
  ranges: IsoDateRange[],
): DateTimeInputMultipleValue => {
  const range = orderedRange(start, end);
  const datesOutside = dates.filter((day) => !isDayInRange(day, range));
  return normalizeMultiple(datesOutside, [...ranges, range]);
};

export const emptyMultiple = (): DateTimeInputMultipleValue => ({
  dates: [],
  ranges: [],
});

export const emptyDraft = (): DateDraft => ({
  dates: [],
  ranges: [],
  pendingStart: null,
  time: toTimeKey(DateTime.now()),
  endTime: toTimeKey(DateTime.now()),
});

export const draftFromValue = (
  value: DateTimeInputValue | undefined,
  selection: DateTimeInputSelection,
  mode: DateTimeInputMode,
): DateDraft => {
  const draft = emptyDraft();
  const now = DateTime.now();

  if (value == null || value === "") return draft;

  if (typeof value === "string") {
    const parsed = parseDateTime(value);
    if (!parsed) return draft;
    if (mode === "time") {
      draft.time = toTimeKey(parsed);
      draft.endTime = draft.time;
      return draft;
    }
    draft.dates = [toDayKey(parsed)];
    draft.time = toTimeKey(parsed);
    draft.endTime = draft.time;
    return draft;
  }

  if ("start" in value && "end" in value && !("dates" in value)) {
    const start = parseDateTime(value.start);
    const end = parseDateTime(value.end);
    if (start) {
      draft.ranges = [
        orderedRange(
          mode === "time" ? toTimeKey(start) : toDayKey(start),
          end
            ? mode === "time"
              ? toTimeKey(end)
              : toDayKey(end)
            : mode === "time"
              ? toTimeKey(start)
              : toDayKey(start),
        ),
      ];
      draft.time = toTimeKey(start);
      draft.endTime = end ? toTimeKey(end) : draft.time;
    }
    if (mode === "time" && start) {
      draft.time = toTimeKey(start);
      draft.endTime = end ? toTimeKey(end) : draft.time;
      draft.ranges = [];
    }
    return draft;
  }

  if ("dates" in value) {
    draft.dates = [...value.dates];
    draft.ranges = value.ranges.map((range) =>
      orderedRange(range.start, range.end),
    );
    const first = parseDateTime(value.dates[0] ?? value.ranges[0]?.start);
    if (first) {
      draft.time = toTimeKey(first);
      draft.endTime = draft.time;
    } else {
      draft.time = toTimeKey(now);
      draft.endTime = draft.time;
    }
    return draft;
  }

  return draft;
};

export const commitDraft = (
  draft: DateDraft,
  selection: DateTimeInputSelection,
  mode: DateTimeInputMode,
): DateTimeInputValue | null => {
  if (mode === "time") {
    if (selection === "range") {
      return orderedRange(draft.time, draft.endTime);
    }
    return draft.time;
  }

  const normalized = normalizeMultiple(draft.dates, draft.ranges);

  if (selection === "single") {
    const day = normalized.dates[0] ?? normalized.ranges[0]?.start;
    if (!day) return null;
    const dt = applyTime(DateTime.fromISO(day), draft.time);
    return toIsoForMode(dt, mode);
  }

  if (selection === "range") {
    const range = normalized.ranges[0];
    const day = normalized.dates[0];
    if (range) {
      if (mode === "date") return range;
      return {
        start: toDateTimeKey(applyTime(DateTime.fromISO(range.start), draft.time)),
        end: toDateTimeKey(applyTime(DateTime.fromISO(range.end), draft.endTime)),
      };
    }
    if (day) {
      const iso = toIsoForMode(applyTime(DateTime.fromISO(day), draft.time), mode);
      return mode === "date" ? { start: day, end: day } : { start: iso, end: iso };
    }
    return null;
  }

  if (mode === "date") return normalized;

  return {
    dates: normalized.dates.map((day) =>
      toDateTimeKey(applyTime(DateTime.fromISO(day), draft.time)),
    ),
    ranges: normalized.ranges.map((range) => ({
      start: toDateTimeKey(applyTime(DateTime.fromISO(range.start), draft.time)),
      end: toDateTimeKey(applyTime(DateTime.fromISO(range.end), draft.endTime)),
    })),
  };
};

export const formatDisplayValue = (
  value: DateTimeInputValue | undefined,
  mode: DateTimeInputMode,
  locale: string,
  placeholders: { empty: string },
): string => {
  if (value == null || value === "") return placeholders.empty;

  if (typeof value === "string") {
    const parsed = parseDateTime(value, locale);
    if (!parsed) return value;
    if (mode === "time") return parsed.toFormat("HH:mm");
    if (mode === "datetime") return parsed.toFormat("dd/MM/yyyy HH:mm");
    return parsed.toFormat("dd/MM/yyyy");
  }

  if ("start" in value && "end" in value && !("dates" in value)) {
    const start = parseDateTime(value.start, locale);
    const end = parseDateTime(value.end, locale);
    const fmt = (dt: DateTime | null) => {
      if (!dt) return "";
      if (mode === "time") return dt.toFormat("HH:mm");
      if (mode === "datetime") return dt.toFormat("dd/MM/yyyy HH:mm");
      return dt.toFormat("dd/MM/yyyy");
    };
    return `${fmt(start)} → ${fmt(end)}`;
  }

  if ("dates" in value) {
    const count =
      value.dates.length +
      value.ranges.reduce((sum, range) => {
        const start = DateTime.fromISO(range.start);
        const end = DateTime.fromISO(range.end);
        if (!start.isValid || !end.isValid) return sum;
        return sum + Math.floor(end.diff(start, "days").days) + 1;
      }, 0);
    return String(count);
  }

  return placeholders.empty;
};

export const monthGrid = (visibleMonth: DateTime, locale: string) => {
  const start = visibleMonth.setLocale(locale).startOf("month");
  const weekday = start.weekday; // 1 Mon … 7 Sun
  const gridStart = start.minus({ days: weekday - 1 });
  const days: DateTime[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(gridStart.plus({ days: i }));
  }
  return days;
};

export const weekdayLabels = (locale: string): string[] => {
  const monday = DateTime.now().setLocale(locale).startOf("week");
  return Array.from({ length: 7 }, (_, i) =>
    monday.plus({ days: i }).toFormat("ccc"),
  );
};
