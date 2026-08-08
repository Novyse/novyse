import React, { useState, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import Button from "@/src/components/ui/button/Button";
import Typography from "@/src/components/ui/typography/Typography";
import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import { SelectOption } from "@/src/components/features/settings/SettingsSelectGroup";

interface SystemChatSelectorProps {
  value: string;
  onChatSelected: (chatId: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

const SystemChatSelector = ({
  value,
  onChatSelected,
  options,
  disabled = false,
}: SystemChatSelectorProps) => {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const [modalVisible, setModalVisible] = useState(false);
  const styles = createStyles(theme);

  const selectedOption = options.find((opt) => opt.value === value);
  const buttonText = selectedOption
    ? selectedOption.labelText || selectedOption.value
    : t("settings.system.none") || "None";

  return (
    <View style={styles.container}>
      <Typography
        style={styles.fieldLabel}
        translationKey="settings.system.selectChat"
      />
      <Button
        text={buttonText}
        icon="Chat01Icon"
        onPress={() => setModalVisible(true)}
        disabled={disabled}
        style={styles.button}
      />
      <SettingsSelectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        options={options}
        value={value}
        onChange={onChatSelected}
        titleKey="settings.system.selectChat"
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

export default SystemChatSelector;
