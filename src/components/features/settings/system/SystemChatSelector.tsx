import { useState, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import Button from "@/src/components/ui/button/Button";
import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import { SelectOption } from "@/src/components/features/settings/SettingsSelectGroup";
import Label from "@/src/components/ui/label/Label";

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
      <Label translationKey="settings.system.selectChat" />
      <Button
        text={buttonText}
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
    button: {
      width: "100%",
    },
  });

export default SystemChatSelector;
