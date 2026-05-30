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

export interface VideoPlayerProps {
  videoId: string;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
  onStateChange?: (
    state: "playing" | "paused" | "ended" | "buffering" | "unknown",
  ) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export interface VideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unmute: () => void;
}

export const YouTubePlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      videoId,
      width = "100%",
      height = "100%",
      onReady,
      onStateChange,
      onTimeUpdate,
    },
    ref,
  ) => {
    const iframeRef = useRef<any>(null);
    const webViewRef = useRef<any>(null);

    const htmlString = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          #player { 
            position: absolute;
            top: -10%;
            left: 0;
            width: 100%;
            height: 120%;
          }
        </style>
        <script src="https://www.youtube.com/iframe_api"></script>
      </head>
      <body>
        <div id="player"></div>
        <script>
          var player;
          var videoId = '${videoId}';
          
          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: videoId,
              playerVars: {
                playsinline: 1,
                controls: 0,
                rel: 0,
                showinfo: 0,
                enablejsapi: 1,
                modestbranding: 1,
                iv_load_policy: 3,
                disablekb: 1,
                fs: 0
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
              }
            });
          }

          function onPlayerReady(event) {
            sendToParent({ type: 'ready' });
            
            setInterval(function() {
              if (player && typeof player.getCurrentTime === 'function') {
                sendToParent({ 
                  type: 'timeupdate', 
                  currentTime: player.getCurrentTime(),
                  duration: player.getDuration()
                });
              }
            }, 500);
          }

          function onPlayerStateChange(event) {
            var state = 'unknown';
            if (event.data === YT.PlayerState.PLAYING) state = 'playing';
            else if (event.data === YT.PlayerState.PAUSED) state = 'paused';
            else if (event.data === YT.PlayerState.ENDED) state = 'ended';
            else if (event.data === YT.PlayerState.BUFFERING) state = 'buffering';
            
            sendToParent({ type: 'statechange', state: state });
          }

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
                player.playVideo();
                break;
              case 'pause':
                player.pauseVideo();
                break;
              case 'seek':
                player.seekTo(message.value, true);
                break;
              case 'volume':
                player.setVolume(message.value);
                break;
              case 'mute':
                player.mute();
                break;
              case 'unmute':
                player.unMute();
                break;
            }
          });
        </script>
      </body>
      </html>
    `;

    const sendCommand = (command: string, value?: any) => {
      if (Platform.OS === "web") {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          let ytCommand = "";
          let args: any[] = [];
          if (command === "play") ytCommand = "playVideo";
          else if (command === "pause") ytCommand = "pauseVideo";
          else if (command === "seek") {
            ytCommand = "seekTo";
            args = [value, true];
          } else if (command === "volume") {
            ytCommand = "setVolume";
            args = [value];
          } else if (command === "mute") ytCommand = "mute";
          else if (command === "unmute") ytCommand = "unMute";

          if (ytCommand) {
            const payload = { event: "command", func: ytCommand, args };
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify(payload),
              "*",
            );
          }
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

    useEffect(() => {
      if (Platform.OS !== "web") return;

      const handleWebMessage = (event: MessageEvent) => {
        if (
          !event.origin.includes("youtube.com") &&
          !event.origin.includes("youtube-nocookie.com")
        ) {
          return;
        }

        try {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;

          if (data.event === "onStateChange") {
            const ytState = data.info;
            let state:
              | "playing"
              | "paused"
              | "ended"
              | "buffering"
              | "unknown" = "unknown";
            if (ytState === 1) state = "playing";
            else if (ytState === 2) state = "paused";
            else if (ytState === 0) state = "ended";
            else if (ytState === 3) state = "buffering";
            if (onStateChange) onStateChange(state);
          } else if (data.event === "infoDelivery" && data.info) {
            if (data.info.currentTime !== undefined) {
              const current = data.info.currentTime;
              const duration = data.info.duration || 0;
              if (onTimeUpdate) onTimeUpdate(current, duration);
            }
          } else if (data.event === "initialDelivery") {
            // YouTube handshake: parent must tell the iframe it is listening
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: "listening" }),
                "*",
              );
            }
            if (onReady) onReady();
          }
        } catch (err) {
          // Ignore non-matching message events
        }
      };

      window.addEventListener("message", handleWebMessage);
      return () => {
        window.removeEventListener("message", handleWebMessage);
      };
    }, [onReady, onStateChange, onTimeUpdate]);

    const embedUrl =
      Platform.OS === "web"
        ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`
        : "";

    return (
      <View style={[styles.container, { width, height }]}>
        {Platform.OS === "web" ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            onLoad={() => {
              // Proactive handshake registration when the iframe completes loading
              if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: "listening" }),
                  "*",
                );
              }
            }}
            style={{
              position: "absolute",
              top: "-10%",
              left: 0,
              width: "100%",
              height: "120%",
              border: "none",
            }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
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
