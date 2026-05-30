import React, { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
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
  ({ channel, video, width = "100%", height = "100%", onReady, onStateChange, onTimeUpdate }, ref) => {
    const iframeRef = useRef<any>(null);
    const webViewRef = useRef<any>(null);

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
      const payload = { command, value };
      const dataStr = JSON.stringify(payload);
      if (Platform.OS === "web") {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(dataStr, "*");
        }
      } else {
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
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
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
      <View style={[styles.container, { width, height }]}>
        {Platform.OS === "web" ? (
          <iframe
            ref={iframeRef}
            srcDoc={htmlString}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="autoplay; encrypted-media; fullscreen"
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
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
