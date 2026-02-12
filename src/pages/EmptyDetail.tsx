import { View, Text, StyleSheet } from "react-native";

export default function EmptyDetail() {
  return (
    <View style={[styles.container]}>
      <Text style={styles.text}>Nothing selected.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  text: {
    fontSize: 18,
    color: "white",
  },
});
