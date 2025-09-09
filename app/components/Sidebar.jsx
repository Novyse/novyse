import React, { useContext } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Image,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import SmartBackground from "./SmartBackground";
import SidebarItem from "./SidebarItem";
import {
  User03Icon,
  Settings02Icon,
  UserGroup03Icon,
  Logout03Icon,
} from "@hugeicons/core-free-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Sidebar = ({
  isSidebarVisible,
  toggleSidebar,
  setIsCreateGroupModalVisible,
  handleSettingsPress,
  logout,
  userData,
  sidebarPosition,
  theme,
}) => {
  const { colorScheme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  return (
    <>
      {isSidebarVisible && (
        <Pressable style={styles.overlay} onPress={toggleSidebar} />
      )}
      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: sidebarPosition }] },
        ]}
      >
        <SmartBackground
          colors={theme?.sideBarGradient}
          style={styles.sidebarContent}
        >
          <View style={styles.profileContainer}>
            <View style={styles.avatar}>
              <Image
                source={{ uri: "https://picsum.photos/200" }}
                style={styles.avatar}
              />
            </View>
            <View style={styles.profileTextContainer}>
              <Text style={styles.profileName}>
                {userData.name && userData.surname
                  ? `${userData.name} ${userData.surname}`
                  : "Loading..."}
              </Text>
              <Text style={styles.profileHandle}>
                {userData.handle ? `@${userData.handle}` : "@loading..."}
              </Text>
            </View>
          </View>
          <View style={styles.menuContainer}>
            <SidebarItem
              text="Profile"
              iconName={User03Icon}
              onPress={toggleSidebar}
            />
            <SidebarItem
              text="Settings"
              iconName={Settings02Icon}
              onPress={() => {
                toggleSidebar();
                handleSettingsPress();
              }}
            />
            <SidebarItem
              text="Nuovo Gruppo"
              iconName={UserGroup03Icon}
              onPress={() => {
                toggleSidebar();
                setIsCreateGroupModalVisible(true);
              }}
            />
            <SidebarItem
              text="Logout"
              iconName={Logout03Icon}
              onPress={() => {
                toggleSidebar();
                AsyncStorage.setItem("isLoggedIn", "false");
                logout();
              }}
            />
          </View>
        </SmartBackground>
      </Animated.View>
    </>
  );
};

export default Sidebar;

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    sidebar: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: 250,
      zIndex: 2,
    },
    sidebarContent: {
      flex: 1,
      padding: 20,
      paddingTop: 60,
      overflow: "hidden",
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    profileContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 30,
    },
    profileTextContainer: {
      flexDirection: "column",
      flex: 1,
    },
    profileName: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "bold",
    },
    profileHandle: {
      color: theme.placeholderText,
      fontSize: 14,
    },
    menuContainer: {
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
  });
}
