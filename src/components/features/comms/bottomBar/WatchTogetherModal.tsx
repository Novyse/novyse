import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useCommsContext } from "@/src/context/CommsContext";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import gateway from "@/src/utils/backend-services/api-gateway";
import { parseVideoUrl } from "@/src/hooks/comms/useWatchTogether";

import Button from "@/src/components/ui/button/Button";
import Typography from "@/src/components/ui/typography/Typography";
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
  const { room } = useCommsContext();
  const styles = createStyles();

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

  // let supportedStyle = styles.supportedCompactText;
  let supportedText = `${t("chat.comms.watchTogether.notSupported")} - ${t("chat.comms.watchTogether.supportedLinks")}: ${t("chat.comms.watchTogether.typeYoutube")}, ${t("chat.comms.watchTogether.typeDirect")}`;

  if (videoUrl.trim()) {
    if (isValid) {
      // supportedStyle = styles.supportedSuccessText;
      supportedText = t("chat.comms.watchTogether.detectedType", {
        type: detectedTypeText,
      });
    } else {
      // supportedStyle = styles.supportedErrorText;
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
      mode="adaptive"
      titleTranslationKey={
        isVideoActive
          ? "chat.comms.watchTogether.modifyTitle"
          : "chat.comms.watchTogether.startTitle"
      }
    >
      <View style={styles.container}>
        <Typography translationKey="chat.comms.watchTogether.description" />
        <TextInput
          placeholder={t("chat.comms.watchTogether.placeholder")}
          value={videoUrl}
          onChangeText={setVideoUrl}
        />
        {!!errorMsg && <Typography text={errorMsg} />}
        <Typography text={supportedText} />
        <View style={styles.buttonsContainer}>
          {isVideoActive && (
            <Button
              variant="danger"
              translationKey="chat.comms.watchTogether.stop"
              onPress={handleStopSession}
              disabled={loading}
            />
          )}

          <Button
            translationKey={
              isVideoActive
                ? "chat.comms.watchTogether.modify"
                : "chat.comms.watchTogether.start"
            }
            onPress={handleStartSession}
            disabled={loading || !videoUrl.trim() || !isValid}
          />
        </View>{" "}
      </View>
    </AdaptiveModal>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      gap: 25,
    },
    buttonsContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 25,
    },
  });
