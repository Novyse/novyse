import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { DateTime } from "luxon";

import Typography from "@/src/components/ui/typography/Typography";
import { Theme } from "@/src/context/ThemeContext";
import { parseDateTime, toTimeKey } from "../../../../utils/dateTimeInput";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
const SNAP = {
  damping: 20,
  stiffness: 240,
  overshootClamping: true,
} as const;

type TimeFieldProps = {
  value: string;
  onChange: (next: string) => void;
  labelKey?: string;
  theme: Theme;
};

const pad = (n: number) => String(n).padStart(2, "0");

const wrapIndex = (index: number, count: number) =>
  ((index % count) + count) % count;

type WheelColumnProps = {
  value: number;
  count: number;
  onChange: (next: number) => void;
  theme: Theme;
};

const WheelItem = ({
  itemValue,
  count,
  translateY,
  theme,
}: {
  itemValue: number;
  count: number;
  translateY: SharedValue<number>;
  theme: Theme;
}) => {
  const style = useAnimatedStyle(() => {
    const exact = -translateY.value / ITEM_HEIGHT;
    const loopOffset = Math.round((exact - itemValue) / count) * count;
    const index = itemValue + loopOffset;
    const dist = Math.abs(index - exact);
    return {
      opacity: interpolate(
        dist,
        [0, 1, 2.3],
        [1, 0.38, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateY: (index - exact) * ITEM_HEIGHT },
        {
          scale: interpolate(
            dist,
            [0, 1, 2.3],
            [1.12, 0.88, 0.72],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: CENTER_PAD,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Typography
        size="xl"
        weight="semibold"
        text={pad(itemValue)}
        color={theme.text}
      />
    </Animated.View>
  );
};

const WheelColumn = ({ value, count, onChange, theme }: WheelColumnProps) => {
  const styles = createStyles(theme);
  const translateY = useSharedValue(-value * ITEM_HEIGHT);
  const startY = useSharedValue(0);
  const dragging = useSharedValue(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pad(value));
  const editingRef = useRef(false);
  const draftRef = useRef(draft);
  const inputRef = useRef<TextInput>(null);
  draftRef.current = draft;

  useEffect(() => {
    if (dragging.value || editing) return;
    translateY.value = withSpring(-value * ITEM_HEIGHT, SNAP);
  }, [value, editing, dragging, translateY]);

  const commitIndex = useCallback(
    (index: number) => {
      const next = wrapIndex(index, count);
      translateY.value = -next * ITEM_HEIGHT;
      onChange(next);
    },
    [count, onChange, translateY],
  );

  const startEdit = useCallback(() => {
    const current = wrapIndex(
      Math.round(-translateY.value / ITEM_HEIGHT),
      count,
    );
    setDraft(pad(current));
    editingRef.current = true;
    setEditing(true);
  }, [count, translateY]);

  const finishEdit = useCallback(() => {
    if (!editingRef.current) return;
    editingRef.current = false;
    const parsed = parseInt(draftRef.current.replace(/\D/g, ""), 10);
    const next = Number.isFinite(parsed)
      ? Math.max(0, Math.min(count - 1, parsed))
      : wrapIndex(Math.round(-translateY.value / ITEM_HEIGHT), count);
    inputRef.current?.blur();
    setEditing(false);
    translateY.value = withSpring(-next * ITEM_HEIGHT, SNAP);
    onChange(next);
  }, [count, onChange, translateY]);

  useEffect(() => {
    if (!editing) return;
    const hide = Keyboard.addListener("keyboardDidHide", finishEdit);
    return () => hide.remove();
  }, [editing, finishEdit]);

  const pan = Gesture.Pan()
    .enabled(!editing)
    .activeOffsetY([-6, 6])
    .failOffsetX([-24, 24])
    .onStart(() => {
      dragging.value = true;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      const exact = -translateY.value / ITEM_HEIGHT;
      const projected = exact - (event.velocityY / ITEM_HEIGHT) * 0.16;
      const snapped = Math.round(projected);
      translateY.value = withSpring(
        -snapped * ITEM_HEIGHT,
        {
          ...SNAP,
          velocity: event.velocityY,
        },
        (finished) => {
          dragging.value = false;
          if (finished) {
            scheduleOnRN(commitIndex, snapped);
          } else {
            scheduleOnRN(
              commitIndex,
              Math.round(-translateY.value / ITEM_HEIGHT),
            );
          }
        },
      );
    });

  const tap = Gesture.Tap()
    .enabled(!editing)
    .onEnd(() => {
      scheduleOnRN(startEdit);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.wheel}>
        <View
          pointerEvents="none"
          style={[styles.selection, { backgroundColor: theme.backgroundCard }]}
        />
        {editing ? (
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={(text) =>
                setDraft(text.replace(/\D/g, "").slice(0, 2))
              }
              onBlur={finishEdit}
              onEndEditing={finishEdit}
              onSubmitEditing={finishEdit}
              submitBehavior="blurAndSubmit"
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={2}
              autoFocus
              selectTextOnFocus
              selectionColor={theme.primary}
              style={[styles.input, { color: theme.text }]}
            />
          </View>
        ) : (
          items.map((itemValue) => (
            <WheelItem
              key={itemValue}
              itemValue={itemValue}
              count={count}
              translateY={translateY}
              theme={theme}
            />
          ))
        )}
      </View>
    </GestureDetector>
  );
};

const TimeField = ({ value, onChange, labelKey, theme }: TimeFieldProps) => {
  const parsed = parseDateTime(value) ?? DateTime.now();
  const styles = createStyles(theme);

  const setHour = (hour: number) => {
    onChange(toTimeKey(parsed.set({ hour, minute: parsed.minute, second: 0 })));
  };

  const setMinute = (minute: number) => {
    onChange(toTimeKey(parsed.set({ hour: parsed.hour, minute, second: 0 })));
  };

  return (
    <View style={styles.wrap}>
      {labelKey ? (
        <Typography size="sm" weight="semibold" translationKey={labelKey} />
      ) : null}
      <View style={styles.row}>
        <WheelColumn
          value={parsed.hour}
          count={24}
          onChange={setHour}
          theme={theme}
        />
        <Typography size="xl" weight="semibold" text=":" />
        <WheelColumn
          value={parsed.minute}
          count={60}
          onChange={setMinute}
          theme={theme}
        />
      </View>
    </View>
  );
};

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: 10,
      alignItems: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    wheel: {
      width: 75,
      height: WHEEL_HEIGHT,
      overflow: "hidden",
    },
    selection: {
      position: "absolute",
      top: CENTER_PAD,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      borderRadius: 25,
    },
    inputWrap: {
      position: "absolute",
      top: CENTER_PAD,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    input: {
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
      width: "100%",
      height: ITEM_HEIGHT,
      padding: 0,
    },
  });

export default TimeField;
