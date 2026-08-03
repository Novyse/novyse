import React, { useState, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import Button from "@/src/components/ui/button/Button";
import AppText from "@/src/components/ui/text/AppText";
import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import { SelectOption } from "@/src/components/features/settings/SettingsSelectGroup";

interface SystemSubSelectorProps {
  value: string;
  onSubSelected: (val: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

const SystemSubSelector = ({
  value,
  onSubSelected,
  options,
  disabled = true,
}: SystemSubSelectorProps) => {
  const { theme } = useContext(ThemeContext);
  const [modalVisible, setModalVisible] = useState(false);
  const styles = createStyles(theme);

  const selectedOption = options.find((opt) => opt.value === value);
  const buttonText = selectedOption
    ? selectedOption.labelText || selectedOption.value
    : value;

  return (
    <View style={styles.container}>
      <AppText
        style={styles.fieldLabel}
        translationKey="settings.system.selectSub"
      />
      <Button
        text={buttonText}
        icon="Layers01Icon"
        onPress={() => setModalVisible(true)}
        disabled={disabled}
        style={styles.button}
      />
      <SettingsSelectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        options={options}
        value={value}
        onChange={onSubSelected}
        titleKey="settings.system.selectSub"
      />
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginVertical: 10,
      width: "100%",
    },
    fieldLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    button: {
      width: "100%",
    },
  });

export default SystemSubSelector;
