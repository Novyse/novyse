import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { CLOUDFLARE_TURNSTILE_PUBLIC } from "@/app.config";

let WebView: any;
if (Platform.OS !== "web") {
  try {
    WebView = require("react-native-webview").WebView;
  } catch (e) {
    console.error("Failed to load react-native-webview", e);
  }
}

interface TurnstileCaptchaProps {
  onVerify: (token: string | null) => void;
}

const TurnstileCaptcha: React.FC<TurnstileCaptchaProps> = ({ onVerify }) => {
  const siteKey = CLOUDFLARE_TURNSTILE_PUBLIC;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      const scriptId = "cloudflare-turnstile-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const renderWidget = () => {
        if ((window as any).turnstile && containerRef.current) {
          try {
            widgetIdRef.current = (window as any).turnstile.render(
              containerRef.current,
              {
                sitekey: siteKey,
                callback: (token: string) => onVerify(token),
                "expired-callback": () => onVerify(null),
                "error-callback": () => onVerify(null),
              },
            );
          } catch (e) {
            console.error("Turnstile render error:", e);
          }
        }
      };

      if ((window as any).turnstile) {
        renderWidget();
      } else {
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            renderWidget();
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }

      return () => {
        if (widgetIdRef.current && (window as any).turnstile) {
          try {
            (window as any).turnstile.remove(widgetIdRef.current);
          } catch (e) {
            // Ignore remove errors on unmount
          }
        }
      };
    }
  }, [siteKey]);

  if (!siteKey) {
    console.error("Cloudflare Turnstile site key is missing in app.config.ts");
    return null;
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        {/* @ts-ignore - div is valid in react-native-web */}
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </View>
    );
  }

  if (!WebView) {
    return null;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <style>
          body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: transparent; 
            overflow: hidden;
          }
          .cf-turnstile {
            transform: scale(0.9);
          }
        </style>
      </head>
      <body>
        <div class="cf-turnstile" 
             data-sitekey="${siteKey}" 
             data-callback="onSuccess" 
             data-expired-callback="onExpired"
             data-error-callback="onError"></div>
        <script>
          function onSuccess(token) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', token: token }));
            }
          }
          function onExpired() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
            }
          }
          function onError() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
            }
          }
        </script>
      </body>
    </html>
  `;

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "success") {
        onVerify(data.token);
      } else if (data.type === "expired" || data.type === "error") {
        onVerify(null);
      }
    } catch (e) {
      console.error("Error parsing Turnstile message:", e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://novyse.com" }}
        onMessage={onMessage}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        transparent={true}
        mixedContentMode="always"
        domStorageEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 70,
    width: "100%",
    maxWidth: 300,
    marginVertical: 15,
    overflow: "hidden",
  },
  webview: {
    backgroundColor: "transparent",
    width: "100%",
    height: "100%",
  },
});

export default TurnstileCaptcha;
