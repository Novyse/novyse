import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";

const VocalContent = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable style={styles.profile}>
        <Text style={styles.profileText}>Ciao</Text>
      </Pressable>
      <Pressable style={styles.profile}>
        <Text style={styles.profileText}>Ciao</Text>
      </Pressable>
      <Pressable style={styles.profile}>
        <Text style={styles.profileText}>Ciao</Text>
      </Pressable>
    </View>
  );
};

export default VocalContent;

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      padding: 15,
      gap: 15,
    },
    profile: {
      backgroundColor: "black",
      borderRadius: 10,
      flexGrow: 1,
    },
    profileText: {
      color: theme.text,
    }
  });
}

