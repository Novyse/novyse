import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import AppText from "@/src/components/ui/text/AppText";
import Icon from "@/src/components/ui/icon/Icon";
import Switch from "@/src/components/ui/switch/Switch";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";

export type SettingsRowProps = {
  iconName?: string;
  rightIconName?: string;
  leftElement?: React.ReactNode;
  labelKey?: string;
  labelOptions?: Record<string, any>;
  labelText?: string;
  value?: string;
  valueKey?: string;
  valueOptions?: Record<string, any>;
  onPress?: () => void;
  danger?: boolean;
  style?: any;
  type?: SettingsRowType;
  isEnabled?: boolean;
  onToggle?: (val: boolean) => void;
  isSelected?: boolean;
};

export type SettingsRowType =
  | "SWITCH"
  | "VALUE"
  | "NAVIGATE"
  | "MODAL"
  | "SELECT_GROUP";

const SettingsRow = ({
  iconName,
  leftElement,
  labelKey,
  labelOptions,
  labelText,
  value,
  valueKey,
  valueOptions,
  onPress,
  danger = false,
  style,
  type = "NAVIGATE",
  isEnabled,
  onToggle,
  isSelected = false,
  rightIconName = "ArrowRight01Icon",
}: SettingsRowProps) => {
  const { theme } = useContext(ThemeContext);
  const rowColor = danger ? theme.dangerText : theme.primary;
  const textColor = danger ? theme.dangerText : theme.text;

  return (
    <HoverAndPressedButton
      style={[
        SettingsRowStyles.row,
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
            SettingsRowStyles.iconContainer,
            { backgroundColor: rowColor + "15" },
          ]}
        >
          <Icon name={iconName} color={rowColor} size={20} />
        </View>
      ) : null}

      <View style={SettingsRowStyles.labelContainer}>
        {labelKey ? (
          <AppText
            style={[SettingsRowStyles.label, { color: textColor }]}
            translationKey={labelKey}
            translationOptions={labelOptions}
          />
        ) : (
          <AppText style={[SettingsRowStyles.label, { color: textColor }]}>
            {labelText}
          </AppText>
        )}
        {valueKey ? (
          <AppText
            style={[SettingsRowStyles.value, { color: theme.subtitle }]}
            translationKey={valueKey}
            translationOptions={valueOptions}
          />
        ) : value && type !== "VALUE" ? (
          <AppText style={[SettingsRowStyles.value, { color: theme.subtitle }]}>
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
            return valueKey ? (
              <AppText
                style={[
                  SettingsRowStyles.rightValue,
                  { color: theme.subtitle },
                ]}
                translationKey={valueKey}
                translationOptions={valueOptions}
              />
            ) : value ? (
              <AppText
                style={[
                  SettingsRowStyles.rightValue,
                  { color: theme.subtitle },
                ]}
              >
                {value}
              </AppText>
            ) : null;
          case "SELECT_GROUP":
            return (
              <View
                style={[
                  SettingsRowStyles.radioOuter,
                  { borderColor: isSelected ? theme.primary : theme.subtitle },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      SettingsRowStyles.radioInner,
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
              <Icon name={rightIconName} color={theme.subtitle} size={20} />
            ) : null;
        }
      })()}
    </HoverAndPressedButton>
  );
};

const SettingsRowStyles = StyleSheet.create({
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

export default SettingsRow;
