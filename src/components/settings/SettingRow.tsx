import React, { useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";
import Switch from "@/src/components/Switch";

export type SettingRowProps = {
  iconName: string;
  labelKey?: string;
  labelText?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
  style?: any;
  type?: SettingRowType;
  isEnabled?: boolean;
  onToggle?: (val: boolean) => void;
};

export type SettingRowType = "SWITCH" | "VALUE" | "NAVIGATE" | "MODAL";

const SettingRow = ({
  iconName,
  labelKey,
  labelText,
  value,
  onPress,
  danger = false,
  rightElement,
  style,
  type = "NAVIGATE",
  isEnabled,
  onToggle,
}: SettingRowProps) => {
  const { theme } = useContext(ThemeContext);
  const rowColor = danger ? "#FF4D4D" : theme.primary;
  const textColor = danger ? "#FF4D4D" : theme.text;

  return (
    <Pressable
      style={({ pressed }) => [
        settingRowStyles.row,
        { borderBottomColor: theme.borderColor },
        pressed && onPress ? { opacity: 0.7 } : undefined,
        style,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
        style={[
          settingRowStyles.iconContainer,
          { backgroundColor: rowColor + "15" },
        ]}
      >
        <Icon name={iconName} color={rowColor} size={20} />
      </View>

      <View style={settingRowStyles.labelContainer}>
        {labelKey ? (
          <AppText
            style={[settingRowStyles.label, { color: textColor }]}
            translationKey={labelKey}
          />
        ) : (
          <AppText style={[settingRowStyles.label, { color: textColor }]}>
            {labelText}
          </AppText>
        )}
        {value && type !== "VALUE" ? (
          <AppText style={[settingRowStyles.value, { color: theme.subtitle2 }]}>
            {value}
          </AppText>
        ) : null}
      </View>

      {rightElement ??
        (() => {
          switch (type) {
            case "SWITCH":
              return (
                <Switch
                  value={!!isEnabled}
                  onValueChange={onToggle || (() => {})}
                />
              );
            case "VALUE":
              return value ? (
                <AppText
                  style={[
                    settingRowStyles.rightValue,
                    { color: theme.subtitle2 },
                  ]}
                >
                  {value}
                </AppText>
              ) : null;
            case "NAVIGATE":
            case "MODAL":
              return onPress ? (
                <Icon
                  name="ArrowRight01Icon"
                  color={theme.subtitle2}
                  size={20}
                />
              ) : null;
            default:
              return null;
          }
        })()}
    </Pressable>
  );
};

const settingRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  value: {
    fontSize: 13,
    marginTop: 2,
  },
  rightValue: {
    fontSize: 15,
    fontWeight: "400",
  },
});

export default SettingRow;
