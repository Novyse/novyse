import { useContext } from "react";
import { View } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";

export default function Divider() {
  const { theme } = useContext(ThemeContext);
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.borderColor,
        marginVertical: 10,
      }}
    />
  );
}
