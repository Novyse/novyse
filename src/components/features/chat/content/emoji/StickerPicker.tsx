import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const StickerPicker = () => {
  return (
    <View style={styles.center}>
      <Text style={styles.wipText}>🚧 Sticker (Work In Progress) 🚧</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  wipText: { color: "#a1a1a1", fontSize: 16 },
});
