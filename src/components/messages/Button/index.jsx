import React, { useContext } from "react";
import { View, ActivityIndicator } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import DefaultButton from "./default";
import DownloadButton from "./download";

const Button = ({
  uuid,
  isAvailable,
  isReady,
  isPlaying,
  type,
  handleDefaultPress,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme, type, isAvailable);

  return (
    <View disabled={!isReady} style={styles.container}>
      {!isAvailable ? (
        <DownloadButton uuid={uuid} styles={styles} />
      ) : !isReady ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <DefaultButton
          type={type}
          isPlaying={isPlaying}
          handleDefaultPress={handleDefaultPress}
        />
      )}
    </View>
  );
};

const createStyles = (theme, type, isAvailable) => ({
  container: {
    width: 45,
    height: 45,
    borderRadius: 100,
    backgroundColor:
      type === "IMAGE" && isAvailable ? "#00000000" : theme.primary,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Button;
