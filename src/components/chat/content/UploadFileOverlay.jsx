import React from "react";
import { View, TouchableWithoutFeedback, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";
import { OverKeyboardView } from "react-native-keyboard-controller";

import HoverAndPressedButton from "../../HoverAndPressedButton";

import Icon from "@/src/components/Icon";

const UploadFileOverlay = ({
  platform,
  sheetIndex,
  onSheetChange,
  onMenuItemPress,
  onFileSelected,
  bottomSheetRef,
  theme,
}) => {
  const styles = createStyle(theme);

  const items = [
    {
      action: "Media",
      translationKey: "chat.uploadOverlay.media",
      iconName: "Album01Icon",
      color: theme.icon,
      disabled: false,
    },
    {
      action: "Camera",
      translationKey: "chat.uploadOverlay.camera",
      iconName: "Camera01Icon",
      color: theme.icon,
      disabled: true,
    },
    {
      action: "File",
      translationKey: "chat.uploadOverlay.file",
      iconName: "File01Icon",
      color: theme.icon,
      disabled: false,
    },
    {
      action: "Location",
      translationKey: "chat.uploadOverlay.location",
      iconName: "Location06Icon",
      color: theme.icon,
      disabled: true,
    },
    {
      action: "Todo",
      translationKey: "chat.uploadOverlay.todo",
      iconName: "TaskAdd01Icon",
      color: theme.icon,
      disabled: true,
    },
    {
      action: "Poll",
      translationKey: "chat.uploadOverlay.poll",
      iconName: "TaskEdit01Icon",
      color: theme.icon,
      disabled: true,
    },
  ];

  const handleMenuItemPress = async (action) => {
    const files = await onMenuItemPress(action);
    if (files && (action === "Media" || action === "File")) {
      onFileSelected(files);
    }
  };

  const renderMenuItem = (
    action,
    iconName,
    color,
    disabled,
    translationKey,
  ) => (
    <HoverAndPressedButton
      key={action}
      style={styles.menuItem}
      onPress={() => handleMenuItemPress(action)}
      disabled={disabled}
    >
      <Icon name={iconName} size={32} color={color} />
      <AppText style={styles.menuText} translationKey={translationKey} />
    </HoverAndPressedButton>
  );

  const renderFloatingMenu = () =>
    platform === "web" ||
    (platform === "desktop" && sheetIndex === 0 && (
      <TouchableWithoutFeedback
        style={styles.fullScreen}
        onPress={() => onSheetChange(-1)}
      >
        <View style={styles.floatingMenuContainer}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.floatingMenu}>
              <View style={[styles.menuRow, { flex: 0 }]}>
                {items.map((item) =>
                  renderMenuItem(
                    item.action,
                    item.iconName,
                    item.color,
                    item.disabled,
                    item.translationKey,
                  ),
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    ));

  return (
    <>
      {renderFloatingMenu()}
      {platform === "mobile" && (
        <OverKeyboardView visible={sheetIndex === 0}>
          <GestureHandlerRootView style={styles.fullScreen}>
            <TouchableWithoutFeedback
              style={styles.fullScreen}
              onPress={() => {
                bottomSheetRef.current?.close();
              }}
            >
              <View style={styles.bottomSheetContainer}>
                <BottomSheet
                  ref={bottomSheetRef}
                  index={sheetIndex}
                  onChange={onSheetChange}
                  snapPoints={["60%"]}
                  backgroundStyle={styles.sheetBackground}
                  handleIndicatorStyle={styles.handleIndicator}
                  enablePanDownToClose={true}
                  enableDynamicSizing={false}
                  animateOnMount={false}
                >
                  <View style={styles.sheetContent}>
                    <View style={styles.menuRow}>
                      {items.map((item) =>
                        renderMenuItem(
                          item.action,
                          item.iconName,
                          item.color,
                          item.disabled,
                          item.translationKey,
                        ),
                      )}
                    </View>
                  </View>
                </BottomSheet>
              </View>
            </TouchableWithoutFeedback>
          </GestureHandlerRootView>
        </OverKeyboardView>
      )}
    </>
  );
};

export default UploadFileOverlay;

const createStyle = (theme) =>
  StyleSheet.create({
    fullScreen: {
      flex: 1,
    },
    bottomSheetContainer: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetBackground: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: theme.backgroundMain,
    },
    handleIndicator: {
      backgroundColor: theme.subtitle,
    },
    sheetContent: {
      flex: 1,
      padding: 20,
    },
    menuRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    menuItem: {
      alignItems: "center",
      borderRadius: 10,
    },
    menuText: {
      marginTop: 6,
      fontSize: 12,
      color: theme.text,
    },
    // web floating menu
    floatingMenuContainer: {
      position: "absolute",
      bottom: 70, // above bottom bar
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 1000,
    },
    floatingMenu: {
      backgroundColor: theme.backgroundMain,
      borderRadius: 15,
      padding: 10,
      alignSelf: "flex-start",
      marginLeft: 10,
      shadowColor: theme.shadowColor,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
  });
