import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, Pressable, Text, View, TextInput } from "react-native";
import SmartBackground from "../../components/SmartBackground";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import APIMethods from "../../utils/APImethods";

const ChangePassword = () => {
  const { setColorScheme, theme, colorScheme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleChangePassword = async () => {
    const changePassword = await APIMethods.changePassword(
      oldPassword,
      newPassword
    );
    console.log("Change password", changePassword);
  };

  return (
    <SmartBackground
      colors={theme.settingPagesGradient}
      style={styles.container}
    >
      <HeaderWithBackArrow goBackTo="./" />
      <TextInput
        placeholder={"Old Password"}
        value={oldPassword}
        onChangeText={(text) => {
          setOldPassword(text);
        }}
      ></TextInput>
      <TextInput
        placeholder={"New Password"}
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text);
        }}
      ></TextInput>
      <Pressable style={styles.themeButton} onPress={handleChangePassword}></Pressable>
    </SmartBackground>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
    themeButton: {
      padding: 10,
      marginVertical: 5,
      borderRadius: 8,
      backgroundColor: "green"
    },
    activeThemeButton: {
      borderWidth: 2,
      borderColor: theme.primary || theme.text,
    },
    themeButtonContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    themeText: {
      color: theme.text,
      fontSize: 16,
    },
    activeIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary || theme.text,
    },
  });

export default ChangePassword;
