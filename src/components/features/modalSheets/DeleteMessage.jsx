import { View, StyleSheet } from "react-native";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Button from "@/src/components/ui/button/Button";
import Typography from "@/src/components/ui/typography/Typography";

const DeleteMessage = ({
  visible,
  onClose,
  onDelete,
  messageCount = 1,
  theme,
  fullscreen,
}) => {
  const styles = createStyles(theme);
  const countOptions = { count: messageCount };

  const onDeletePress = () => {
    onDelete();
    onClose();
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      mode="modal"
      fullscreen={fullscreen}
      hideCloseX
    >
      <View style={styles.container}>
        <Typography
          size="md"
          translationKey="modals.delete_message.subtitle"
          translationOptions={countOptions}
        />

        <View style={styles.buttonRow}>
          <Button
            variant="secondary"
            translationKey="modals.delete_message.cancel"
            onPress={onClose}
            style={styles.button}
          />
          <Button
            variant="danger"
            translationKey="modals.delete_message.delete"
            icon="Delete02Icon"
            onPress={onDeletePress}
          />
        </View>
      </View>
    </AdaptiveModal>
  );
};

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      gap: 25,
    },
    modalTitle: {
      color: theme.dangerText,
    },
    buttonRow: {
      flexDirection: "row",
      alignSelf: "flex-end",
      gap: 25,
    },
  });
}

export default DeleteMessage;
