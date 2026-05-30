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

export interface TwitchPlayerProps {
  channel?: string;
  video?: string;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
  onStateChange?: (state: "playing" | "paused" | "ended" | "unknown") => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  style?: any;
}

export interface TwitchPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unmute: () => void;
}

export const TwitchPlayer = forwardRef<TwitchPlayerRef, TwitchPlayerProps>(
  (
    {
      channel,
      video,
      width = "100%",
      height = "100%",
      onReady,
      onStateChange,
      onTimeUpdate,
      style,
    },
    ref,
  ) => {
    const iframeRef = useRef<any>(null);
    const webViewRef = useRef<any>(null);
    const playerInstanceRef = useRef<any>(null);

    const parentHost =
      Platform.OS === "web" ? window.location.hostname : "localhost";

    // 1. WEB ONLY: Use the dynamic Twitch JavaScript SDK to prevent Chrome null origin / srcDoc sandbox issues
    useEffect(() => {
      if (Platform.OS !== "web") return;

      let intervalId: any;
      let timeoutId: any;

      const initPlayer = () => {
        if (!(window as any).Twitch || !iframeRef.current) return;

        try {
          // Clear any previous elements in container
          iframeRef.current.innerHTML = "";

          const parents = Array.from(
            new Set([parentHost, "localhost", "127.0.0.1"]),
          );

          const player = new (window as any).Twitch.Player(iframeRef.current, {
            channel,
            video,
            width: "100%",
            height: "100%",
            controls: false, // Hide controls
            autoplay: true,
            muted: true,
            parent: parents,
          });
          playerInstanceRef.current = player;
          setTimeout(() => {
            const iframe = iframeRef.current?.querySelector("iframe");
            if (iframe) {
              iframe.setAttribute(
                "allow",
                "autoplay; encrypted-media; picture-in-picture; fullscreen",
              );
            }
          }, 50);

          player.addEventListener((window as any).Twitch.Player.READY, () => {
            if (onReady) onReady();

            intervalId = setInterval(() => {
              if (
                playerInstanceRef.current &&
                typeof playerInstanceRef.current.getCurrentTime === "function"
              ) {
                const current = playerInstanceRef.current.getCurrentTime();
                const dur = playerInstanceRef.current.getDuration();
                if (onTimeUpdate) onTimeUpdate(current, dur);
              }
            }, 500);
          });

          player.addEventListener((window as any).Twitch.Player.PLAY, () => {
            if (onStateChange) onStateChange("playing");
          });

          player.addEventListener((window as any).Twitch.Player.PAUSE, () => {
            if (onStateChange) onStateChange("paused");
          });

          player.addEventListener((window as any).Twitch.Player.ENDED, () => {
            if (onStateChange) onStateChange("ended");
          });
        } catch (err) {
          console.error("Failed to initialize Twitch Player on Web:", err);
        }
      };

      if (!(window as any).Twitch) {
        const script = document.createElement("script");
        script.src = "https://player.twitch.tv/js/embed/v1.js";
        script.async = true;
        script.onload = () => {
          timeoutId = setTimeout(initPlayer, 250);
        };
        document.body.appendChild(script);
      } else {
        timeoutId = setTimeout(initPlayer, 250);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [channel, video]);

    // 2. NATIVE ONLY: Webview HTML String with parent parameters
    const htmlString = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          #player { width: 100%; height: 100%; }
        </style>
        <script src="https://player.twitch.tv/js/embed/v1.js"></script>
      </head>
      <body>
        <div id="player"></div>
        <script>
          var player;
          var channel = ${channel ? `'${channel}'` : "null"};
          var video = ${video ? `'${video}'` : "null"};
          
          var options = {
            width: '100%',
            height: '100%',
            controls: false,
            autoplay: true,
            muted: true,
            parent: ['localhost', '127.0.0.1']
          };
          
          if (channel) {
            options.channel = channel;
          } else if (video) {
            options.video = video;
          }

          player = new Twitch.Player('player', options);

          player.addEventListener(Twitch.Player.READY, function() {
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
          });

          player.addEventListener(Twitch.Player.PLAY, function() {
            sendToParent({ type: 'statechange', state: 'playing' });
          });

          player.addEventListener(Twitch.Player.PAUSE, function() {
            sendToParent({ type: 'statechange', state: 'paused' });
          });

          player.addEventListener(Twitch.Player.ENDED, function() {
            sendToParent({ type: 'statechange', state: 'ended' });
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
                player.play();
                break;
              case 'pause':
                player.pause();
                break;
              case 'seek':
                player.seek(message.value);
                break;
              case 'volume':
                player.setVolume(message.value / 100);
                break;
              case 'mute':
                player.setMuted(true);
                break;
              case 'unmute':
                player.setMuted(false);
                break;
            }
          });
        </script>
      </body>
      </html>
    `;

    const sendCommand = (command: string, value?: any) => {
      if (Platform.OS === "web") {
        if (!playerInstanceRef.current) return;
        try {
          switch (command) {
            case "play":
              playerInstanceRef.current.play();
              break;
            case "pause":
              playerInstanceRef.current.pause();
              break;
            case "seek":
              playerInstanceRef.current.seek(value);
              break;
            case "volume":
              playerInstanceRef.current.setVolume(value / 100);
              break;
            case "mute":
              playerInstanceRef.current.setMuted(true);
              break;
            case "unmute":
              playerInstanceRef.current.setMuted(false);
              break;
          }
        } catch (e) {
          console.error("Error executing Twitch SDK action:", e);
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
        try {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          if (data && data.type) {
            handlePlayerEvent(data);
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

    return (
      <View style={[styles.container, { width, height }, style]}>
        {Platform.OS === "web" ? (
          <div
            ref={iframeRef}
            style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: htmlString }}
            style={{ flex: 1, backgroundColor: "#000", pointerEvents: "none" }}
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
