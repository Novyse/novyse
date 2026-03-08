import React from "react";
import { View } from "react-native";
import { useThemeContext } from "@/context/ThemeContext";
import StatusMessage from "@/src/components/StatusMessage";

const InitPage = () => {
  const { theme } = useThemeContext();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.backgroundMainGradient[1],
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <StatusMessage type="info" content={["Loading your data..."]} />
    </View>
  );
};

export default InitPage;
