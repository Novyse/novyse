import React, { useContext } from "react";
import { ThemeContext } from "@/src/context/ThemeContext";
import SettingRow from "@/src/components/settings/SettingRow";
import Icon from "@/src/components/ui/icon/Icon";

export type SelectOption<T extends string = string> = {
  value: T;
  labelKey?: string;
  labelOptions?: Record<string, any>;
  labelText?: string;
  valueText?: string;
  valueKey?: string;
  valueOptions?: Record<string, any>;
  iconName?: string;
  leftElement?: React.ReactNode;
};

export type SettingSelectGroupProps<T extends string = string> = {
  options: SelectOption<T>[];
  value: T;
  onChange: (val: T) => void;
};

function SettingSelectGroup<T extends string = string>({
  options,
  value,
  onChange,
}: SettingSelectGroupProps<T>) {
  return (
    <>
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isLast = index === options.length - 1;

        return (
          <SettingRow
            key={option.value}
            iconName={option.iconName}
            leftElement={option.leftElement}
            labelKey={option.labelKey}
            labelOptions={option.labelOptions}
            labelText={option.labelText}
            value={option.valueText}
            valueKey={option.valueKey}
            valueOptions={option.valueOptions}
            type="SELECT_GROUP"
            onPress={() => onChange(option.value)}
            isSelected={isSelected}
            style={isLast ? { borderBottomWidth: 0 } : undefined}
          />
        );
      })}
    </>
  );
}

export default SettingSelectGroup;
