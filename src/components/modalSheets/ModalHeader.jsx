import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "../AppText";
import Icon from "../Icon";

const ModalHeader = ({
  title,
  titleTranslationKey,
  titleTranslationOptions,
  titleStyle,
  hideCloseX = false,
  onClose,
  theme,
}) => {
  const shouldShowClose = !hideCloseX;
  const hasTitle = Boolean(title) || Boolean(titleTranslationKey);
  const hasHeader = hasTitle || shouldShowClose;

  if (!hasHeader) {
    return null;
  }

  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.headerBar,
        !hasTitle && shouldShowClose && styles.headerBarIconOnly,
      ]}
    >
      {hasTitle && (
        <AppText
          text={title}
          translationKey={titleTranslationKey}
          translationOptions={titleTranslationOptions}
          style={[
            styles.titleText,
            titleStyle,
            !shouldShowClose && styles.titleTextFull,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        />
      )}
      {shouldShowClose && (
        <Icon
          name="Cancel01Icon"
          style={styles.closeIcon}
          onPress={onClose}
        />
      )}
    </View>
  );
};

function createStyles(theme) {
  return StyleSheet.create({
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 25,
    },
    headerBarIconOnly: {
      justifyContent: "flex-end",
    },
    titleText: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      marginRight: 8,
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    titleTextFull: {
      marginRight: 0,
    },
    closeIcon: {
      flexShrink: 0,
    },
  });
}

export default ModalHeader;
