import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";

const ModalHeader = ({
  title,
  titleTranslationKey,
  titleTranslationOptions,
  hideCloseX = false,
  onClose,
}) => {
  const shouldShowClose = !hideCloseX;
  const hasTitle = Boolean(title) || Boolean(titleTranslationKey);
  const hasHeader = hasTitle || shouldShowClose;

  if (!hasHeader) {
    return null;
  }

  const styles = createStyles();

  return (
    <View
      style={[
        styles.headerBar,
        !hasTitle && shouldShowClose && styles.headerBarIconOnly,
      ]}
    >
      {hasTitle && (
        <Typography
          weight="semibold"
          text={title}
          translationKey={titleTranslationKey}
          translationOptions={titleTranslationOptions}
          numberOfLines={1}
          ellipsizeMode="tail"
        />
      )}
      {shouldShowClose && (
        <Icon name="Cancel01Icon" style={styles.closeIcon} onPress={onClose} />
      )}
    </View>
  );
};

function createStyles() {
  return StyleSheet.create({
    headerBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 25,
    },
    headerBarIconOnly: {
      justifyContent: "flex-end",
    },
    closeIcon: {
      flexShrink: 0,
    },
  });
}

export default ModalHeader;
