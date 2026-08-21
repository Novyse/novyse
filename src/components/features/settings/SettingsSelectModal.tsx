import { View, StyleSheet } from "react-native";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import SettingsSelectGroup, { SelectOption } from "./SettingsSelectGroup";
import Typography from "@/src/components/ui/typography/Typography";

export interface SettingsSelectModalProps<T extends string = string> {
  visible: boolean;
  onClose: () => void;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  titleKey?: string;
  titleText?: string;
  loading?: boolean;
  loadingKey?: string;
  snapPoints?: string[];
  mode?: "adaptive" | "modal" | "bottomsheet";
}

function SettingsSelectModal<T extends string = string>({
  visible,
  onClose,
  options,
  value,
  onChange,
  titleKey,
  titleText,
  loading = false,
  loadingKey,
  snapPoints = ["50%"],
  mode = "adaptive",
}: SettingsSelectModalProps<T>) {
  const styles = createStyle();

  const handleSelect = (val: T) => {
    onChange(val);
    onClose();
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      mode={mode}
      snapPoints={snapPoints}
      title={titleText}
      titleTranslationKey={titleKey}
    >
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Typography
              translationKey={loadingKey || "common.loading"}
            />
          </View>
        ) : (
          <View style={styles.listWrapper}>
            <SettingsSelectGroup
              options={options}
              value={value}
              onChange={handleSelect}
            />
          </View>
        )}
      </View>
    </AdaptiveModal>
  );
}

function createStyle() {
  return StyleSheet.create({
    container: {
      width: "100%",
    },
    loadingContainer: {
      padding: 25,
      alignItems: "center",
    },
    listWrapper: {
      width: "100%",
      borderRadius: 25,
      overflow: "hidden",
    },
  });
}

export default SettingsSelectModal;
