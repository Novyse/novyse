import { useState, useEffect } from "react";

import {
  useAudioRecorder,
  AudioModule,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";

import storage from "@/src/utils/storage/file";
import { RecordPreset } from "@/src/utils/record/audio/presets";

const useVoiceRecord = (onSendMessage) => {
  // --- LOGICA AUDIO ---
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordPreset.AAC);
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  // Cleanup
  useEffect(() => {
    return () => {
      // Ferma la registrazione se era in corso quando il componente si smonta
      if (isRecording) {
        audioRecorder.stop().catch((e) => {
          console.warn("Error during audio cleanup:", e);
        });
      }
    };
  }, [audioRecorder, isRecording]);

  // Avvio Registrazione
  const handleStartRecording = async () => {
    try {
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permesso negato",
          "Serve il microfono per registrare audio.",
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
    } catch (err) {
      console.error("Errore start recording:", err);
      setIsRecording(false);
    }
  };

  // Stop e Invia (Click sul pulsante Send durante rec)
  const handleStopAndSend = async () => {
    if (!isRecording) return;

    try {
      await audioRecorder.stop();
      const tempUri = audioRecorder.uri;

      setIsRecording(false);

      if (onSendMessage && tempUri) {
        const files = [
          {
            name: `novyse_vocal_${Date.now()}.m4a`,
            uri: tempUri,
            mimeType: "audio/aac",
          },
        ];

        onSendMessage("message", "", files);
      }
    } catch (err) {
      console.error("Errore stop recording:", err);
    }
  };

  const handleStopAndDraft = async (onAppendFilesToDraft) => {
    if (!isRecording) return;

    try {
      await audioRecorder.stop();
      const tempUri = audioRecorder.uri;

      setIsRecording(false);

      if (onAppendFilesToDraft && tempUri) {
        const { ref, size } = await storage.save.byUri(tempUri);

        const files = [
          {
            name: `novyse_vocal_${Date.now()}.m4a`,
            uri: tempUri,
            mimeType: "audio/aac",
            ref,
            size,
          },
        ];

        onAppendFilesToDraft(files);
      }
    } catch (err) {
      console.error("Errore draft recording:", err);
    }
  };

  // Annulla
  const handleCancelRecording = async () => {
    if (!isRecording) return;
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      console.log("Registrazione annullata");
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePause = async () => {
    if (!isRecording) return;
    try {
      if (recorderState.isRecording) {
        await audioRecorder.pause();
      } else {
        await audioRecorder.record();
      }
    } catch (err) {
      console.error("Errore toggle pause:", err);
    }
  };

  return {
    isRecording,
    isPaused: !recorderState.isRecording,
    recorderState,
    handleStartRecording,
    handleStopAndSend,
    handleStopAndDraft,
    handleCancelRecording,
    handleTogglePause,
  };
};

export default useVoiceRecord;
