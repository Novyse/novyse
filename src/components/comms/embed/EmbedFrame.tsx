import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { View, StyleSheet } from "react-native";
import Platform from "@/src/utils/device/type";
import { getElectronUrl } from "@/src/utils/electron/url";

let WebView: any;
if (Platform === "mobile") {
  try {
    WebView = require("react-native-webview").WebView;
  } catch (e) {
    // WebView not available
  }
}

export interface EmbedPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unmute: () => void;
}

export interface EmbedFrameProps {
  htmlContent: string;
  srcUrl?: string;
  onReady?: () => void;
  onStateChange?: (
    state: "playing" | "paused" | "ended" | "buffering" | "unknown",
  ) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  iframeStyle?: React.CSSProperties;
  pointerEventsNone?: boolean;
  width?: string | number;
  height?: string | number;
}

export const EmbedFrame = forwardRef<EmbedPlayerRef, EmbedFrameProps>(
  (
    {
      htmlContent,
      srcUrl,
      onReady,
      onStateChange,
      onTimeUpdate,
      iframeStyle,
      pointerEventsNone = false,
      width = "100%",
      height = "100%",
    },
    ref,
  ) => {
    const iframeRef = useRef<any>(null);
    const webViewRef = useRef<any>(null);
    const [desktopSrc, setDesktopSrc] = useState<string | null>(null);

    useEffect(() => {
      if (Platform !== "desktop") return;

      const base = getElectronUrl();
      if (!base) return;

      fetch(`${base}/embed/html`, {
        method: "POST",
        headers: { "Content-Type": "text/html" },
        body: htmlContent,
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.url) setDesktopSrc(data.url);
        })
        .catch((err) =>
          console.error(
            "[EmbedFrame] Failed to push html to local server",
            err,
          ),
        );
    }, [htmlContent]);

    const sendCommand = (command: string, value?: any) => {
      const payload = JSON.stringify({ command, value });

      if (Platform === "mobile") {
        if (webViewRef.current) {
          const js = `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`;
          webViewRef.current.injectJavaScript(js);
        }
      } else {
        const iframe =
          iframeRef.current?.tagName === "IFRAME"
            ? iframeRef.current
            : (iframeRef.current?.querySelector?.("iframe") ??
              iframeRef.current);
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(payload, "*");
        }
      }
    };

    useImperativeHandle(ref, () => ({
      play: () => sendCommand("play"),
      pause: () => sendCommand("pause"),
      seek: (s: number) => sendCommand("seek", s),
      setVolume: (v: number) => sendCommand("volume", v),
      mute: () => sendCommand("mute"),
      unmute: () => sendCommand("unmute"),
    }));

    const handleEvent = (data: any) => {
      switch (data.type) {
        case "ready":
          onReady?.();
          break;
        case "statechange":
          onStateChange?.(data.state);
          break;
        case "timeupdate":
          onTimeUpdate?.(data.currentTime, data.duration);
          break;
      }
    };

    useEffect(() => {
      if (Platform === "mobile") return;

      const handler = (event: MessageEvent) => {
        try {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          if (data?.type) handleEvent(data);
        } catch {
          // ignore
        }
      };

      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }, [onReady, onStateChange, onTimeUpdate]);

    const handleNativeMessage = (event: any) => {
      try {
        handleEvent(JSON.parse(event.nativeEvent.data));
      } catch {
        // ignore
      }
    };

    const pe = pointerEventsNone ? "none" : ("auto" as any);
    const baseIframeStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      border: "none",
      pointerEvents: pe,
      ...iframeStyle,
    };

    if (Platform === "desktop") {
      if (!desktopSrc) {
        return (
          <View
            style={[
              styles.container,
              { width: width as any, height: height as any },
            ]}
          />
        );
      }
      return (
        <View
          style={[
            styles.container,
            { width: width as any, height: height as any },
          ]}
        >
          {/* @ts-ignore*/}
          <iframe
            ref={iframeRef}
            src={desktopSrc}
            style={baseIframeStyle}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </View>
      );
    }

    if (Platform === "web") {
      const src = srcUrl || undefined;
      const srcdoc = srcUrl ? undefined : htmlContent;
      return (
        <View
          style={[
            styles.container,
            { width: width as any, height: height as any },
          ]}
        >
          {/* @ts-ignore */}
          <iframe
            ref={iframeRef}
            src={src}
            srcDoc={srcdoc}
            style={baseIframeStyle}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </View>
      );
    }

    if (!WebView) return null;
    return (
      <View
        style={[
          styles.container,
          { width: width as any, height: height as any },
        ]}
      >
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={{ flex: 1, backgroundColor: "#000" }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleNativeMessage}
        />
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
