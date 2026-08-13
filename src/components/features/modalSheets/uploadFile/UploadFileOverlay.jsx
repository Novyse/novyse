import { View, StyleSheet } from "react-native";

import Typography from "@/src/components/ui/typography/Typography";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Platform from "@/src/utils/device/type";

const MENU_ITEMS = [
  {
    action: "Media",
    translationKey: "chat.uploadOverlay.media",
    iconName: "Album01Icon",
    disabled: false,
  },
  {
    action: "Camera",
    translationKey: "chat.uploadOverlay.camera",
    iconName: "Camera01Icon",
    disabled: true,
  },
  {
    action: "File",
    translationKey: "chat.uploadOverlay.file",
    iconName: "File01Icon",
    disabled: false,
  },
  {
    action: "Recording",
    translationKey: "chat.uploadOverlay.recording",
    iconName: "RecordIcon",
    disabled: false,
  },
  {
    action: "Location",
    translationKey: "chat.uploadOverlay.location",
    iconName: "Location06Icon",
    disabled: true,
  },
  {
    action: "Todo",
    translationKey: "chat.uploadOverlay.todo",
    iconName: "TaskAdd01Icon",
    disabled: true,
  },
  {
    action: "Poll",
    translationKey: "chat.uploadOverlay.poll",
    iconName: "TaskEdit01Icon",
    disabled: true,
  },
];

const UploadFileOverlay = ({
  visible,
  onClose,
  onMenuItemPress,
  onFileSelected,
  theme,
}) => {
  const styles = createStyle(theme);

  const handleMenuItemPress = async (action) => {
    const files = await onMenuItemPress(action);
    if (files && (action === "Media" || action === "File")) {
      onFileSelected(files);
    }
  };

  const filteredMenuItems = MENU_ITEMS.filter(
    (item) => !(item.action === "Recording" && Platform === "mobile"),
  );

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      snapPoints={["60%"]}
      scrollable={false}
      hideCloseX={true}
      hideOverlay={true}
      popover={true}
    >
      <View style={styles.content}>
        <View style={styles.menuRow}>
          {filteredMenuItems.map((item) => (
            <HoverAndPressedButton
              key={item.action}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.action)}
              disabled={item.disabled}
            >
              <Icon name={item.iconName} size={32} color={theme.icon} />
              <Typography
                size="xs"
                translationKey={item.translationKey}
              />
            </HoverAndPressedButton>
          ))}
        </View>
      </View>
    </AdaptiveModal>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    content: {
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    menuItem: {
      alignItems: "center",
      borderRadius: 10,
      gap: 5
    },
  });

export default UploadFileOverlay;
