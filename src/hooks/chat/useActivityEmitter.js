import { useCallback, useEffect, useRef } from "react";
import SocketIO from "@/src/utils/backend-services/socket-io";

const TYPING_TIMEOUT = 3000;

const useActivityEmitter = (chatUUID) => {
  const typingTimerRef = useRef(null);
  const currentActivityRef = useRef(null);

  const emit = useCallback(
    (action) => {
      if (!chatUUID) return;
      const sender = SocketIO.send();
      if (!sender) return;
      currentActivityRef.current = action;
      sender.activity(chatUUID, action);
    },
    [chatUUID],
  );

  const emitTyping = useCallback(() => {
    if (!chatUUID) return;

    // If not already typing, emit TYPING
    if (currentActivityRef.current !== "TYPING") {
      emit("TYPING");
    }

    // Reset the inactivity timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      emit(null);
      typingTimerRef.current = null;
    }, TYPING_TIMEOUT);
  }, [chatUUID, emit]);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (currentActivityRef.current === "TYPING") {
      emit(null);
    }
  }, [emit]);

  const emitRecording = useCallback(
    (isRecording) => {
      if (isRecording) {
        // Clear typing if was typing before
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        emit("RECORDING_VOICE");
      } else {
        if (currentActivityRef.current === "RECORDING_VOICE") {
          emit(null);
        }
      }
    },
    [emit],
  );

  const emitUploading = useCallback(
    (isUploading) => {
      if (isUploading) {
        // Clear typing if was typing before
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        emit("UPLOADING_FILE");
      } else {
        if (currentActivityRef.current === "UPLOADING_FILE") {
          emit(null);
        }
      }
    },
    [emit],
  );

  // Cleanup on unmount or chat change
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (currentActivityRef.current) {
        const sender = SocketIO.send();
        if (sender && chatUUID) {
          sender.activity(chatUUID, null);
        }
        currentActivityRef.current = null;
      }
    };
  }, [chatUUID]);

  return {
    emitTyping,
    stopTyping,
    emitRecording,
    emitUploading,
  };
};

export default useActivityEmitter;
