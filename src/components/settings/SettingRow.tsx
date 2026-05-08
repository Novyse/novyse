import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";
import Switch from "@/src/components/Switch";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";

export type SettingRowProps = {
  iconName?: string;
  leftElement?: React.ReactNode;
  labelKey?: string;
  labelText?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  style?: any;
  type?: SettingRowType;
  isEnabled?: boolean;
  onToggle?: (val: boolean) => void;
  isSelected?: boolean;
};

export type SettingRowType =
  | "SWITCH"
  | "VALUE"
  | "NAVIGATE"
  | "MODAL"
  | "SELECT_GROUP";

const SettingRow = ({
  iconName,
  leftElement,
  labelKey,
  labelText,
  value,
  onPress,
  danger = false,
  style,
  type = "NAVIGATE",
  isEnabled,
  onToggle,
  isSelected = false,
}: SettingRowProps) => {
  const { theme } = useContext(ThemeContext);
  const rowColor = danger ? theme.dangerText : theme.primary;
  const textColor = danger ? theme.dangerText : theme.text;

  return (
    <HoverAndPressedButton
      style={[
        settingRowStyles.row,
        { borderBottomColor: theme.borderColor },
        style,
      ]}
      onPress={onPress}
    >
      {leftElement ? (
        leftElement
      ) : iconName ? (
        <View
          style={[
            settingRowStyles.iconContainer,
            { backgroundColor: rowColor + "15" },
          ]}
        >
          <Icon name={iconName} color={rowColor} size={20} />
        </View>
      ) : null}

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
          <AppText style={[settingRowStyles.value, { color: theme.subtitle }]}>
            {value}
          </AppText>
        ) : null}
      </View>

      {(() => {
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
                style={[settingRowStyles.rightValue, { color: theme.subtitle }]}
              >
                {value}
              </AppText>
            ) : null;
          case "SELECT_GROUP":
            return (
              <View
                style={[
                  settingRowStyles.radioOuter,
                  { borderColor: isSelected ? theme.primary : theme.subtitle },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      settingRowStyles.radioInner,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                )}
              </View>
            );
          case "NAVIGATE":
          case "MODAL":
          default:
            return onPress ? (
              <Icon name="ArrowRight01Icon" color={theme.subtitle} size={20} />
            ) : null;
        }
      })()}
    </HoverAndPressedButton>
  );
};

const settingRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  iconContainer: {
    width: 35,
    height: 35,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
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
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default SettingRow;
