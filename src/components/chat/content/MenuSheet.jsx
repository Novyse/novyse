import React, { useCallback } from "react";
import {
  Platform,
  View,
  TouchableWithoutFeedback,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";
import { OverKeyboardView } from "react-native-keyboard-controller";
import { TouchableOpacity } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { getPlatform } from "@/src/utils/device/type";

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
      backgroundColor: theme.backgroundSecondary || "#F0F0F0",
    },
    handleIndicator: {
      backgroundColor: theme.divider || "#ccc",
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
      backgroundColor: theme.backgroundBottomsheet || "#F0F0F0",
      borderRadius: 15,
      padding: 15,
      alignSelf: "flex-start",
      width: "30%",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
  });

const MenuSheet = ({
  platform,
  sheetIndex,
  onSheetChange,
  onMenuItemPress,
  bottomSheetRef,
  theme,
}) => {
  const styles = createStyle(theme);

  const renderMenuItem = (action, iconName, color) => (
    <TouchableOpacity
      key={action}
      style={styles.menuItem}
      onPress={() => onMenuItemPress(action)}
    >
      <Ionicons name={iconName} size={32} color={color} />
      <Text style={styles.menuText}>{action}</Text>
    </TouchableOpacity>
  );

  const renderFloatingMenu = () =>
    platform === "web" &&
    sheetIndex === 0 && (
      <TouchableWithoutFeedback
        style={styles.fullScreen}
        onPress={() => onSheetChange(-1)}
      >
        <View style={styles.floatingMenuContainer}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.floatingMenu}>
              <View style={[styles.menuRow, { flex: 0 }]}>
                {getPlatform() !== "web" && (
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => onMenuItemPress("Gallery")}
                  >
                    <Ionicons name="images" size={32} color="royalblue" />
                    <Text style={styles.menuText}>Gallery</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.menuItem}
                  onPress={() => onMenuItemPress("File")}
                >
                  <Ionicons name="document" size={32} color="gray" />
                  <Text style={styles.menuText}>File</Text>
                </Pressable>
                {getPlatform() !== "web" && (
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => onMenuItemPress("Camera")}
                  >
                    <Ionicons name="camera" size={32} color="darkorange" />
                    <Text style={styles.menuText}>Camera</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    );

  return (
    <>
      {renderFloatingMenu()}
      {platform !== "web" && (
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
                      {renderMenuItem("Gallery", "images", "royalblue")}
                      {renderMenuItem("File", "document", "gray")}
                      {renderMenuItem("Camera", "camera", "darkorange")}
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

export default MenuSheet;
