import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { View, StyleSheet, Platform } from "react-native";

let WebView: any;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

export interface DirectVideoPlayerProps {
  videoUrl: string;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
  onStateChange?: (
    state: "playing" | "paused" | "ended" | "unknown",
  ) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export interface DirectVideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unmute: () => void;
}

export const DirectVideoPlayer = forwardRef<
  DirectVideoPlayerRef,
  DirectVideoPlayerProps
>(
  (
    {
      videoUrl,
      width = "100%",
      height = "100%",
      onReady,
      onStateChange,
      onTimeUpdate,
    },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const webViewRef = useRef<any>(null);

    // Native implementation (using Webview)
    const htmlString = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          video { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <video id="player" playsinline autoplay muted></video>
        <script>
          var player = document.getElementById('player');
          player.src = '${videoUrl}';

          player.addEventListener('loadedmetadata', function() {
            sendToParent({ type: 'ready' });
          });

          player.addEventListener('play', function() {
            sendToParent({ type: 'statechange', state: 'playing' });
          });

          player.addEventListener('pause', function() {
            sendToParent({ type: 'statechange', state: 'paused' });
          });

          player.addEventListener('ended', function() {
            sendToParent({ type: 'statechange', state: 'ended' });
          });

          player.addEventListener('timeupdate', function() {
            sendToParent({ 
              type: 'timeupdate', 
              currentTime: player.currentTime,
              duration: player.duration || 0
            });
          });

          function sendToParent(data) {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify(data));
            } else {
              window.parent.postMessage(JSON.stringify(data), '*');
            }
          }

          window.addEventListener('message', function(e) {
            var message;
            try {
              message = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            } catch(err) {
              return;
            }
            
            if (!message || !player) return;
            
            switch(message.command) {
              case 'play':
                player.play().catch(function(e) {});
                break;
              case 'pause':
                player.pause();
                break;
              case 'seek':
                player.currentTime = message.value;
                break;
              case 'volume':
                player.volume = message.value / 100;
                break;
              case 'mute':
                player.muted = true;
                break;
              case 'unmute':
                player.muted = false;
                break;
            }
          });
        </script>
      </body>
      </html>
    `;

    const sendCommand = (command: string, value?: any) => {
      if (Platform.OS === "web") {
        if (!videoRef.current) return;
        try {
          switch (command) {
            case "play":
              videoRef.current.play().catch(() => {});
              break;
            case "pause":
              videoRef.current.pause();
              break;
            case "seek":
              videoRef.current.currentTime = value;
              break;
            case "volume":
              videoRef.current.volume = value / 100;
              break;
            case "mute":
              videoRef.current.muted = true;
              break;
            case "unmute":
              videoRef.current.muted = false;
              break;
          }
        } catch (e) {
          console.error("Error executing DirectVideoPlayer action:", e);
        }
      } else {
        const payload = { command, value };
        const dataStr = JSON.stringify(payload);
        if (webViewRef.current) {
          const js = `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(dataStr)} })); true;`;
          webViewRef.current.injectJavaScript(js);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      play: () => sendCommand("play"),
      pause: () => sendCommand("pause"),
      seek: (seconds: number) => sendCommand("seek", seconds),
      setVolume: (volume: number) => sendCommand("volume", volume),
      mute: () => sendCommand("mute"),
      unmute: () => sendCommand("unmute"),
    }));

    const handlePlayerEvent = (data: any) => {
      switch (data.type) {
        case "ready":
          if (onReady) onReady();
          break;
        case "statechange":
          if (onStateChange) onStateChange(data.state);
          break;
        case "timeupdate":
          if (onTimeUpdate) onTimeUpdate(data.currentTime, data.duration);
          break;
      }
    };

    const handleNativeMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        handlePlayerEvent(data);
      } catch (err) {
        // Ignore invalid message formatting
      }
    };

    // Web-only effects
    useEffect(() => {
      if (Platform.OS !== "web" || !videoRef.current) return;

      const video = videoRef.current;

      const handleLoadedMetadata = () => {
        if (onReady) onReady();
      };

      const handlePlay = () => {
        if (onStateChange) onStateChange("playing");
      };

      const handlePause = () => {
        if (onStateChange) onStateChange("paused");
      };

      const handleEnded = () => {
        if (onStateChange) onStateChange("ended");
      };

      const handleTimeUpdate = () => {
        if (onTimeUpdate) {
          onTimeUpdate(video.currentTime, video.duration || 0);
        }
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("ended", handleEnded);
      video.addEventListener("timeupdate", handleTimeUpdate);

      // Trigger load if URL changes
      video.load();

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }, [videoUrl]);

    return (
      <View style={[styles.container, { width: width as any, height: height as any }]}>
        {Platform.OS === "web" ? (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            autoPlay
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "#000",
            }}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: htmlString }}
            style={{ flex: 1, backgroundColor: "#000" }}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleNativeMessage}
          />
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
