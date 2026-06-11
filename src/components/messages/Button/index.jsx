import React, { useContext } from "react";
import { View, ActivityIndicator } from "react-native";

import { ThemeContext } from "@/src/context/ThemeContext";

import DefaultButton from "./default";
import DownloadButton from "./DownloadButton";
import CircularProgress from "./CircularProgress";
import useFileProgress from "@/src/hooks/file/useFileProgress";
import queueManager from "@/src/utils/chat/queueManager";

const Button = ({
  uuid,
  isAvailable,
  isPending,
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
      {isProgressing || isPending ? (
        <CircularProgress
          progress={progress && progress.total > 0 ? progress.loaded / progress.total : 0}
          color={theme.text}
          onCancel={() => queueManager.cancelFileTransfer(uuid)}
        />
      ) : !isAvailable ? (
        <DownloadButton uuid={uuid} styles={styles} />
      ) : !isReady ? (
        <ActivityIndicator size="small" color={theme.text} />
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
      type === "IMAGE" && isAvailable ? null : theme.primary,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Button;
