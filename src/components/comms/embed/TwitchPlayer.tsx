import React, { forwardRef, useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Platform from "@/src/utils/device/type";
import { EmbedFrame, EmbedPlayerRef } from "./EmbedFrame";
import { buildPlayerHtml } from "./playerHtml";

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

export interface TwitchPlayerRef extends EmbedPlayerRef {}

// ── Build the Twitch HTML page (used on desktop + mobile) ────────
function getTwitchHtml(channel?: string, video?: string): string {
  return buildPlayerHtml({
    headExtra: `<script src="https://player.twitch.tv/js/embed/v1.js"></script>`,
    css: `body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}
      #player{width:100%;height:100%}
      #player iframe{width:100%!important;height:100%!important}`,
    bodyContent: `
<div id="player"></div>
<script>
var opts={width:'100%',height:'100%',controls:false,autoplay:true,muted:true,
  parent:['localhost','127.0.0.1']};
${channel ? `opts.channel='${channel}';` : ""}
${video ? `opts.video='${video}';` : ""}
var player=new Twitch.Player('player',opts);
player.addEventListener(Twitch.Player.READY,function(){
  sendToParent({type:'ready'});
  setInterval(function(){
    if(player&&typeof player.getCurrentTime==='function'){
      sendToParent({type:'timeupdate',currentTime:player.getCurrentTime(),duration:player.getDuration()});
    }
  },500);
});
player.addEventListener(Twitch.Player.PLAY,function(){sendToParent({type:'statechange',state:'playing'});});
player.addEventListener(Twitch.Player.PAUSE,function(){sendToParent({type:'statechange',state:'paused'});});
player.addEventListener(Twitch.Player.ENDED,function(){sendToParent({type:'statechange',state:'ended'});});

function handleCommand(cmd,val){
  if(!player)return;
  switch(cmd){
    case 'play':player.play();break;
    case 'pause':player.pause();break;
    case 'seek':player.seek(val);break;
    case 'volume':player.setVolume(val/100);break;
    case 'mute':player.setMuted(true);break;
    case 'unmute':player.setMuted(false);break;
  }
}
</script>`,
  });
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
    const embedRef = useRef<EmbedPlayerRef>(null);
    const containerRef = useRef<any>(null);
    const playerInstanceRef = useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      play: () => embedRef.current?.play(),
      pause: () => embedRef.current?.pause(),
      seek: (s: number) => embedRef.current?.seek(s),
      setVolume: (v: number) => embedRef.current?.setVolume(v),
      mute: () => embedRef.current?.mute(),
      unmute: () => embedRef.current?.unmute(),
    }));

    const htmlContent = getTwitchHtml(channel, video);

    if (Platform === "web") {
      useEffect(() => {
        let intervalId: any;
        let timeoutId: any;

        const parentHost = window.location.hostname;

        const initPlayer = () => {
          if (!(window as any).Twitch || !containerRef.current) return;
          try {
            containerRef.current.innerHTML = "";
            const parents = Array.from(
              new Set([parentHost, "localhost", "127.0.0.1"]),
            );

            const player = new (window as any).Twitch.Player(
              containerRef.current,
              {
                channel,
                video,
                width: "100%",
                height: "100%",
                controls: false,
                autoplay: true,
                muted: true,
                parent: parents,
              },
            );
            playerInstanceRef.current = player;

            setTimeout(() => {
              const iframe = containerRef.current?.querySelector("iframe");
              iframe?.setAttribute(
                "allow",
                "autoplay; encrypted-media; picture-in-picture; fullscreen",
              );
            }, 50);

            player.addEventListener((window as any).Twitch.Player.READY, () => {
              onReady?.();
              intervalId = setInterval(() => {
                if (playerInstanceRef.current?.getCurrentTime) {
                  onTimeUpdate?.(
                    playerInstanceRef.current.getCurrentTime(),
                    playerInstanceRef.current.getDuration(),
                  );
                }
              }, 500);
            });
            player.addEventListener((window as any).Twitch.Player.PLAY, () =>
              onStateChange?.("playing"),
            );
            player.addEventListener((window as any).Twitch.Player.PAUSE, () =>
              onStateChange?.("paused"),
            );
            player.addEventListener((window as any).Twitch.Player.ENDED, () =>
              onStateChange?.("ended"),
            );
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

      React.useImperativeHandle(ref, () => ({
        play: () => playerInstanceRef.current?.play(),
        pause: () => playerInstanceRef.current?.pause(),
        seek: (s: number) => playerInstanceRef.current?.seek(s),
        setVolume: (v: number) => playerInstanceRef.current?.setVolume(v / 100),
        mute: () => playerInstanceRef.current?.setMuted(true),
        unmute: () => playerInstanceRef.current?.setMuted(false),
      }));

      return (
        <View
          style={[
            styles.container,
            { width: width as any, height: height as any },
            style,
          ]}
        >
          {/* @ts-ignore */}
          <div
            ref={containerRef}
            style={{ width: "100%", height: "100%", pointerEvents: "none" }}
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
        pointerEventsNone
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
