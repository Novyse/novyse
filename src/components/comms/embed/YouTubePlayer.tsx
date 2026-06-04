import React, { forwardRef, useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Platform from "@/src/utils/device/type";
import { EmbedFrame, EmbedPlayerRef } from "./EmbedFrame";
import { buildPlayerHtml } from "./playerHtml";

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

export interface VideoPlayerRef extends EmbedPlayerRef {}

function getYouTubeHtml(videoId: string): string {
  return buildPlayerHtml({
    headExtra: `<script src="https://www.youtube.com/iframe_api"></script>`,
    css: `body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}
      #player{position:absolute;top:-10%;left:0;width:100%;height:120%}`,
    bodyContent: `
      <div id="player"></div>
      <script>
      var player;
      function onYouTubeIframeAPIReady(){
        player=new YT.Player('player',{
          height:'100%',width:'100%',videoId:'${videoId}',
          playerVars:{playsinline:1,controls:0,rel:0,showinfo:0,enablejsapi:1,modestbranding:1,iv_load_policy:3,disablekb:1,fs:0},
          events:{'onReady':function(){
            sendToParent({type:'ready'});
            setInterval(function(){
              if(player&&typeof player.getCurrentTime==='function'){
                sendToParent({type:'timeupdate',currentTime:player.getCurrentTime(),duration:player.getDuration()});
              }
            },500);
          },'onStateChange':function(e){
            var s='unknown';
            if(e.data===YT.PlayerState.PLAYING)s='playing';
            else if(e.data===YT.PlayerState.PAUSED)s='paused';
            else if(e.data===YT.PlayerState.ENDED)s='ended';
            else if(e.data===YT.PlayerState.BUFFERING)s='buffering';
            sendToParent({type:'statechange',state:s});
          }}
        });
      }
      function handleCommand(cmd,val){
        if(!player)return;
        switch(cmd){
          case 'play':player.playVideo();break;
          case 'pause':player.pauseVideo();break;
          case 'seek':player.seekTo(val,true);break;
          case 'volume':player.setVolume(val);break;
          case 'mute':player.mute();break;
          case 'unmute':player.unMute();break;
        }
      }
      </script>
    `,
  });
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
    const embedRef = useRef<EmbedPlayerRef>(null);
    const iframeRef = useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      play: () => embedRef.current?.play(),
      pause: () => embedRef.current?.pause(),
      seek: (s: number) => embedRef.current?.seek(s),
      setVolume: (v: number) => embedRef.current?.setVolume(v),
      mute: () => embedRef.current?.mute(),
      unmute: () => embedRef.current?.unmute(),
    }));

    const htmlContent = getYouTubeHtml(videoId);

    if (Platform === "web") {
      const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`;

      useEffect(() => {
        const handler = (event: MessageEvent) => {
          if (
            !event.origin.includes("youtube.com") &&
            !event.origin.includes("youtube-nocookie.com")
          )
            return;

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
              onStateChange?.(state);
            } else if (
              data.event === "infoDelivery" &&
              data.info?.currentTime !== undefined
            ) {
              onTimeUpdate?.(data.info.currentTime, data.info.duration || 0);
            } else if (data.event === "initialDelivery") {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: "listening" }),
                  "*",
                );
              }
              onReady?.();
            }
          } catch {
            /* ignore */
          }
        };

        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
      }, [onReady, onStateChange, onTimeUpdate]);

      React.useImperativeHandle(ref, () => ({
        play: () => sendYtCmd("playVideo"),
        pause: () => sendYtCmd("pauseVideo"),
        seek: (s: number) => sendYtCmd("seekTo", [s, true]),
        setVolume: (v: number) => sendYtCmd("setVolume", [v]),
        mute: () => sendYtCmd("mute"),
        unmute: () => sendYtCmd("unMute"),
      }));

      function sendYtCmd(func: string, args: any[] = []) {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func, args }),
            "*",
          );
        }
      }

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
            src={embedUrl}
            onLoad={() => {
              if (iframeRef.current?.contentWindow) {
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
        </View>
      );
    }

    return (
      <EmbedFrame
        ref={embedRef}
        htmlContent={htmlContent}
        onReady={onReady}
        onStateChange={onStateChange}
        onTimeUpdate={onTimeUpdate}
        iframeStyle={{
          position: "absolute",
          top: "-10%",
          left: "0",
          width: "100%",
          height: "120%",
        }}
        width={width}
        height={height}
      />
    );
  },
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
