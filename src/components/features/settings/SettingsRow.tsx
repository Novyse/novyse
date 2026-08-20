import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import Switch from "@/src/components/ui/switch/Switch";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";

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
  const rowVariant = danger ? "danger" : "default";

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
            { backgroundColor: rowColor + 15 },
          ]}
        >
          <Icon name={iconName} color={rowColor}/>
        </View>
      ) : null}

      <View style={SettingsRowStyles.labelContainer}>
        {labelKey ? (
          <Typography
            weight="medium"
            variant={rowVariant}
            translationKey={labelKey}
            translationOptions={labelOptions}
          />
        ) : (
          <Typography weight="medium" variant={rowVariant}>{labelText}</Typography>
        )}
        {valueKey ? (
          <Typography
            weight="medium"
            translationKey={valueKey}
            translationOptions={valueOptions}
          />
        ) : value && type !== "VALUE" ? (
          <Typography weight="medium" >{value}</Typography>
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
              <Typography
                variant="subtitle"
                translationKey={valueKey}
                translationOptions={valueOptions}
              />
            ) : value ? (
              <Typography variant="subtitle">{value}</Typography>
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
              <Icon name={rightIconName} color={theme.subtitle}/>
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
