import React, { useContext, useEffect, useRef } from "react";
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
import { useRouter } from "expo-router";

const Sidebar = ({
  isSidebarVisible,
  toggleSidebar,
  setIsCreateGroupModalVisible,
  handleSettingsPress,
  logout,
  userData,
  theme,
}) => {
  const { colorScheme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  // 1. Definisci i valori animati all'interno del componente
  const sidebarPosition = useRef(new Animated.Value(-250)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const SIDEBAR_OVERLAY_SPEED = 175;

  const router = useRouter();

  // 2. Sincronizza le animazioni con il cambio di isSidebarVisible
  useEffect(() => {
    if (isSidebarVisible) {
      // Apertura: avvia le due animazioni in parallelo
      Animated.parallel([
        Animated.timing(sidebarPosition, {
          toValue: 0,
          duration: SIDEBAR_OVERLAY_SPEED,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.7,
          duration: SIDEBAR_OVERLAY_SPEED,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Chiusura: avvia le due animazioni in parallelo
      Animated.parallel([
        Animated.timing(sidebarPosition, {
          toValue: -250,
          duration: SIDEBAR_OVERLAY_SPEED,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: SIDEBAR_OVERLAY_SPEED,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSidebarVisible]);

  return (
    <>
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={isSidebarVisible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleSidebar} />
      </Animated.View>
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
              {/* <Text style={styles.profileHandle}>
                {userData.handle ? `@${userData.handle}` : "@loading..."}
              </Text> */}
            </View>
          </View>

          <View style={styles.menuContainer}>
            <SidebarItem
              text="Profile"
              iconName={"User03Icon"}
              onPress={toggleSidebar}
            />
            <SidebarItem
              text="Settings"
              iconName={"Settings02Icon"}
              onPress={() => {
                toggleSidebar();
                handleSettingsPress();
              }}
            />
            <SidebarItem
              text="Nuovo Gruppo"
              iconName={"UserGroup03Icon"}
              onPress={() => {
                toggleSidebar();
                setIsCreateGroupModalVisible(true);
              }}
            />
            <SidebarItem
              text="Logout"
              iconName={"Logout03Icon"}
              onPress={() => {
                toggleSidebar();
                logout(router);
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
      overflow: "hidden",
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme?.overlay || "rgba(0, 0, 0, 0.4)",
      zIndex: 1,
    },
    profileContainer: {
      flexDirection: "column",
      alignItems: "center",
      paddingHorizontal: 15,
      marginTop: 50,
      marginBottom: 25,
    },
    profileTextContainer: {
      width: "100%",
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
      width: 50,
      height: 50,
      marginBottom: 15,
      borderRadius: 25,
      alignSelf: "flex-start",
    },
  });
}
