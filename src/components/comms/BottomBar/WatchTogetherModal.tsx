import React, { useState, useEffect, useContext } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import Typography from "@/src/components/ui/typography/Typography";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import gateway from "@/src/utils/backend-services/api-gateway";
import { parseVideoUrl } from "@/src/hooks/comms/useWatchTogether";
import TextInput from "@/src/components/ui/input/TextInput";

interface WatchTogetherModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WatchTogetherModal: React.FC<WatchTogetherModalProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { room } = useCommsContext();
  const styles = createStyles(theme);

  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const roomMetadata = room?.metadata ? JSON.parse(room.metadata) : null;
  const watchTogether = roomMetadata?.watchTogether;
  const isVideoActive = !!watchTogether?.url;

  const parsed = videoUrl.trim()
    ? parseVideoUrl(videoUrl.trim())
    : { type: null };
  const isValid = parsed.type !== null;

  let detectedTypeText = "";
  if (videoUrl.trim()) {
    if (parsed.type === "youtube") {
      detectedTypeText = t("chat.comms.watchTogether.typeYoutube");
    } else if (parsed.type === "direct") {
      detectedTypeText = t("chat.comms.watchTogether.typeDirect");
    }
  }

  let supportedStyle = styles.supportedCompactText;
  let supportedText = `${t("chat.comms.watchTogether.notSupported")} - ${t("chat.comms.watchTogether.supportedLinks")}: ${t("chat.comms.watchTogether.typeYoutube")}, ${t("chat.comms.watchTogether.typeDirect")}`;

  if (videoUrl.trim()) {
    if (isValid) {
      supportedStyle = styles.supportedSuccessText;
      supportedText = t("chat.comms.watchTogether.detectedType", {
        type: detectedTypeText,
      });
    } else {
      supportedStyle = styles.supportedErrorText;
      supportedText = `${t("chat.comms.watchTogether.notSupported")} - ${t("chat.comms.watchTogether.supportedLinks")}: ${t("chat.comms.watchTogether.typeYoutube")}, ${t("chat.comms.watchTogether.typeDirect")}`;
    }
  }

  useEffect(() => {
    if (visible) {
      setVideoUrl(watchTogether?.url || "");
      setErrorMsg("");
      setLoading(false);
    }
  }, [visible]);

  const handleStartSession = async () => {
    if (!videoUrl.trim() || !isValid) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const roomUUID = room?.name || "";
      // @ts-ignore
      const res = await gateway.watchTogether.start(roomUUID, videoUrl.trim());
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(t("chat.comms.watchTogether.invalidUrl"));
      }
    } catch (err) {
      console.error("[WatchTogetherModal] Failed to start:", err);
      setErrorMsg(t("chat.comms.watchTogether.invalidUrl"));
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const roomUUID = room?.name || "";
      // @ts-ignore
      const res = await gateway.watchTogether.stop(roomUUID);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(t("chat.comms.watchTogether.invalidUrl"));
      }
    } catch (err) {
      console.error("[WatchTogetherModal] Failed to stop:", err);
      setErrorMsg(t("chat.comms.watchTogether.invalidUrl"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      titleTranslationKey={
        isVideoActive
          ? "chat.comms.watchTogether.modifyTitle"
          : "chat.comms.watchTogether.startTitle"
      }
    >
      <View style={styles.container}>
        <Typography
          style={styles.description}
          translationKey="chat.comms.watchTogether.description"
        />

        <TextInput
          placeholder={t("chat.comms.watchTogether.placeholder")}
          value={videoUrl}
          onChangeText={setVideoUrl}
        />

        {!!errorMsg && <Typography style={styles.errorText} text={errorMsg} />}

        <View style={styles.supportedCompactContainer}>
          <Typography style={supportedStyle} text={supportedText} />
        </View>

        <View style={styles.buttonsContainer}>
          {isVideoActive && (
            <Pressable
              style={[styles.btn, styles.btnStop]}
              onPress={handleStopSession}
              disabled={loading}
            >
              <Typography
                style={styles.btnTextStop}
                translationKey="chat.comms.watchTogether.stop"
              />
            </Pressable>
          )}

          <Pressable
            style={[
              styles.btn,
              styles.btnConfirm,
              (loading || !videoUrl.trim() || !isValid) && styles.btnDisabled,
            ]}
            onPress={handleStartSession}
            disabled={loading || !videoUrl.trim() || !isValid}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <Typography
                style={styles.btnTextConfirm}
                translationKey={
                  isVideoActive
                    ? "chat.comms.watchTogether.modify"
                    : "chat.comms.watchTogether.start"
                }
              />
            )}
          </Pressable>
        </View>
      </View>
    </AdaptiveModal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {},
    description: {
      fontSize: 14,
      color: theme.subtitle,
      lineHeight: 20,
      marginBottom: 20,
    },
    textInput: {
      height: 48,
      borderRadius: 8,
      paddingHorizontal: 16,
      backgroundColor: theme.backgroundTextField,
      color: theme.text,
      fontSize: 15,
      marginBottom: 20,
      outlineStyle: "none" as any,
    },
    errorText: {
      color: theme.iconDanger,
      fontSize: 13,
      marginBottom: 16,
    },
    supportedCompactContainer: {
      marginTop: 4,
      marginBottom: 16,
    },
    supportedCompactText: {
      fontSize: 11,
      color: theme.subtitle,
      opacity: 0.6,
    },
    supportedSuccessText: {
      fontSize: 11,
      color: theme.iconSuccess,
      fontWeight: "600",
    },
    supportedErrorText: {
      fontSize: 11,
      color: theme.iconDanger,
      fontWeight: "600",
    },
    buttonsContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    btn: {
      height: 40,
      paddingHorizontal: 20,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    btnConfirm: {
      backgroundColor: theme.primary,
    },
    btnStop: {
      backgroundColor: theme.iconDanger,
      marginRight: "auto",
    },
    btnTextConfirm: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    btnTextStop: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    btnDisabled: {
      opacity: 0.5,
    },
  });
