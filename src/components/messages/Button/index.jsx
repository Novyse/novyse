import React, { useContext } from "react";
import { View, ActivityIndicator } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import DefaultButton from "./default";
import DownloadButton from "./DownloadButton";
import CircularProgress from "./CircularProgress";
import useFileProgress from "@/src/hooks/file/useFileProgress";
import queueManager from "@/src/utils/chat/queueManager";

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

  const progress = useFileProgress(uuid);
  const isProgressing = progress && progress.loaded < progress.total;

  return (
    <View disabled={!isReady} style={styles.container}>
      {isProgressing ? (
        <CircularProgress
          progress={progress.loaded / progress.total}
          color="#fff"
          onCancel={() => queueManager.cancelFileTransfer(uuid)}
        />
      ) : !isAvailable ? (
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
