import React, { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import SettingRow from "@/src/components/settings/SettingRow";
import Icon from "@/src/components/Icon";

export type SelectOption<T extends string = string> = {
  value: T;
  labelKey?: string;
  labelText?: string;
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
            labelText={option.labelText}
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
