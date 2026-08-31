import { useState, useRef, useCallback, useEffect } from "react";
import storage from "@/src/utils/storage/file";

/**
 * Hook for screen recording using the browser's getDisplayMedia API.
 * Uses the same screen/window picker as LiveKit screen sharing
 * (navigator.mediaDevices.getDisplayMedia), but records via MediaRecorder
 * instead of publishing tracks.
 *
 * Returns controls that mirror useVoiceRecord so the MiddleBar can
 * reuse the same recording UI (duration, pause/resume, stop-to-draft,
 * cancel, etc.).
 */
const useScreenRecord = (onActivityChange) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const elapsedBeforePauseRef = useRef(0);

  // Guards
  const isStoppingRef = useRef(false);
  const isBusyStoppingRef = useRef(false); // prevents double-call

  const originalStreamsRef = useRef([]);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const [metering, setMetering] = useState(-60);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _cleanup();
    };
  }, []);

  const _cleanup = useCallback(() => {
    isStoppingRef.current = false;
    isBusyStoppingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    originalStreamsRef.current.forEach((s) => {
      s.getTracks().forEach((t) => t.stop());
    });
    originalStreamsRef.current = [];
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startTimeRef.current = 0;
    elapsedBeforePauseRef.current = 0;
    setMetering(-60);
  }, []);

  const _startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed =
        elapsedBeforePauseRef.current +
        (Date.now() - startTimeRef.current);
      setDurationMillis(elapsed);

      // Compute metering
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const val = (dataArrayRef.current[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArrayRef.current.length);
        let db = 20 * Math.log10(rms);
        if (db < -60 || !isFinite(db)) db = -60;
        setMetering(db);
      } else {
        setMetering(-60);
      }
    }, 100);
  }, []);

  const _stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedBeforePauseRef.current +=
      Date.now() - startTimeRef.current;
    setMetering(-60);
  }, []);

  // Ref to always have the latest cancel function for track.onended
  const cancelRef = useRef(null);

  /**
   * Prompt the user to select a screen/window using the same
   * getDisplayMedia API that LiveKit uses for screen sharing.
   */
  const handleStartScreenRecording = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.warn("Could not get microphone stream:", err);
      }

      originalStreamsRef.current = [screenStream];
      if (micStream) originalStreamsRef.current.push(micStream);

      let mixedStream = screenStream;
      let hasAudio = screenStream.getAudioTracks().length > 0 || (micStream && micStream.getAudioTracks().length > 0);
      
      if (hasAudio) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioContext.createMediaStreamDestination();
        
        if (screenStream.getAudioTracks().length > 0) {
          const source1 = audioContext.createMediaStreamSource(new MediaStream([screenStream.getAudioTracks()[0]]));
          source1.connect(dest);
        }

        if (micStream && micStream.getAudioTracks().length > 0) {
          const source2 = audioContext.createMediaStreamSource(micStream);
          source2.connect(dest);

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source2.connect(analyser);
          analyserRef.current = analyser;
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        }

        mixedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      }

      mediaStreamRef.current = mixedStream;
      isStoppingRef.current = false;
      isBusyStoppingRef.current = false;

      // Pick MIME type based on actual tracks in the stream
      const mimeType = _getPreferredMimeType(hasAudio);

      // Create MediaRecorder — try with options first, fall back to no options
      let recorder;
      try {
        recorder = new MediaRecorder(mixedStream, {
          mimeType,
          videoBitsPerSecond: 2500000,
        });
      } catch (err) {
        recorder = new MediaRecorder(mixedStream);
      }

      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      });

      recorder.addEventListener("error", (e) => {
        console.error("MediaRecorder error:", e.error || e);
      });

      // If the user stops sharing via the browser's own "Stop sharing" button
      screenStream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (!isStoppingRef.current) {
            cancelRef.current?.();
          }
        });
      });

      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setIsPaused(false);
      setDurationMillis(0);
      elapsedBeforePauseRef.current = 0;
      _startTimer();
      onActivityChange?.(true);
    } catch (err) {
      _cleanup();
      setIsRecording(false);
      setIsPaused(false);
      setDurationMillis(0);
    }
  }, [_cleanup, _startTimer, onActivityChange]);

  /**
   * Toggle pause/resume on the active recording.
   */
  const handleTogglePause = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      _startTimer();
      onActivityChange?.(true);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      _stopTimer();
      onActivityChange?.(false);
    }
  }, [isRecording, isPaused, _startTimer, _stopTimer, onActivityChange]);

  const _stopRecording = useCallback(
    (onComplete) => {
      if (isBusyStoppingRef.current) return;

      const recorder = mediaRecorderRef.current;
      if (!recorder || !isRecording) return;

      if (recorder.state === "inactive") return;

      isBusyStoppingRef.current = true;
      isStoppingRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      recorder.addEventListener("stop", async () => {
        try {
          const mimeType = recorder.mimeType || "video/webm";
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });

          if (blob.size === 0) return;

          const fileName = `novyse_screen_recording_${Date.now()}.${ext}`;
          const { ref, size } = await storage.save.byBytes(blob);
          const uri = URL.createObjectURL(blob);

          const files = [
            {
              name: fileName,
              uri,
              mimeType,
              ref,
              size,
              file: new File([blob], fileName, { type: mimeType }),
            },
          ];

          onComplete?.(files);
        } catch (err) {
          console.error("Error saving screen recording:", err);
        } finally {
          _cleanup();
          setIsRecording(false);
          setIsPaused(false);
          setDurationMillis(0);
          onActivityChange?.(false);
        }
      }, { once: true });

      try {
        recorder.stop();
      } catch (err) {
        console.error("recorder.stop() threw:", err);
        _cleanup();
        setIsRecording(false);
        setIsPaused(false);
        setDurationMillis(0);
        onActivityChange?.(false);
      }
    },
    [isRecording, _cleanup, onActivityChange]
  );

  /**
   * Stop recording and add the video file to draft.
   */
  const handleStopAndDraft = useCallback(
    (onAppendFilesToDraft) => _stopRecording(onAppendFilesToDraft),
    [_stopRecording]
  );

  /**
   * Stop recording and send the video file.
   */
  const handleStopAndSend = useCallback(
    (onSendMessage) => {
      _stopRecording((files) => {
        if (onSendMessage && files) {
          onSendMessage("message", "", files);
        }
      });
    },
    [_stopRecording]
  );

  /**
   * Cancel the recording without saving anything.
   */
  const handleCancelScreenRecording = useCallback(() => {
    if (!isRecording) return;

    isStoppingRef.current = true;
    isBusyStoppingRef.current = true;

    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.warn("Error cancelling screen recording:", err);
    }

    _cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setDurationMillis(0);
    onActivityChange?.(false);
  }, [isRecording, _cleanup, onActivityChange]);

  // Keep cancelRef in sync
  useEffect(() => {
    cancelRef.current = handleCancelScreenRecording;
  }, [handleCancelScreenRecording]);

  return {
    isScreenRecording: isRecording,
    isScreenRecordingPaused: isPaused,
    screenRecordingState: {
      durationMillis,
      isRecording: isRecording && !isPaused,
      metering,
      activeStream: mediaStreamRef.current,
    },
    handleStartScreenRecording,
    handleStopScreenAndDraft: handleStopAndDraft,
    handleStopScreenAndSend: handleStopAndSend,
    handleToggleScreenPause: handleTogglePause,
    handleCancelScreenRecording,
  };
};

/**
 * Returns the best supported MIME type for MediaRecorder.
 * Chooses codecs based on whether the stream has audio tracks.
 */
function _getPreferredMimeType(hasAudio) {
  const candidates = hasAudio
    ? [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ]
    : [
        // Video-only: do NOT include audio codecs
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];

  for (const candidate of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(candidate)
    ) {
      return candidate;
    }
  }

  return "video/webm";
}

export default useScreenRecord;
