import React, { forwardRef, useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Platform from "@/src/utils/device/type";
import { EmbedFrame, EmbedPlayerRef } from "./EmbedFrame";
import { buildPlayerHtml } from "./playerHtml";

export interface DirectVideoPlayerProps {
  videoUrl: string;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
  onStateChange?: (state: "playing" | "paused" | "ended" | "unknown") => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export interface DirectVideoPlayerRef extends EmbedPlayerRef {}

function getDirectVideoHtml(videoUrl: string): string {
  return buildPlayerHtml({
    css: `body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}
      video{width:100%;height:100%;object-fit:contain}`,
    bodyContent: `
      <video id="v" playsinline autoplay muted src="${videoUrl}"></video>
      <script>
      var v=document.getElementById('v');
      v.addEventListener('loadedmetadata',function(){sendToParent({type:'ready'});});
      v.addEventListener('play',function(){sendToParent({type:'statechange',state:'playing'});});
      v.addEventListener('pause',function(){sendToParent({type:'statechange',state:'paused'});});
      v.addEventListener('ended',function(){sendToParent({type:'statechange',state:'ended'});});
      v.addEventListener('timeupdate',function(){
        sendToParent({type:'timeupdate',currentTime:v.currentTime,duration:v.duration||0});
      });
      function handleCommand(cmd,val){
        if(!v)return;
        switch(cmd){
          case 'play':v.play().catch(function(){});break;
          case 'pause':v.pause();break;
          case 'seek':v.currentTime=val;break;
          case 'volume':v.volume=val/100;break;
          case 'mute':v.muted=true;break;
          case 'unmute':v.muted=false;break;
        }
      }
      </script>
    `,
  });
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
    const embedRef = useRef<EmbedPlayerRef>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    React.useImperativeHandle(ref, () => ({
      play: () => embedRef.current?.play(),
      pause: () => embedRef.current?.pause(),
      seek: (s: number) => embedRef.current?.seek(s),
      setVolume: (v: number) => embedRef.current?.setVolume(v),
      mute: () => embedRef.current?.mute(),
      unmute: () => embedRef.current?.unmute(),
    }));

    const htmlContent = getDirectVideoHtml(videoUrl);

    if (Platform === "web") {
      useEffect(() => {
        if (!videoRef.current) return;
        const v = videoRef.current;

        const onLoaded = () => onReady?.();
        const onPlay = () => onStateChange?.("playing");
        const onPause = () => onStateChange?.("paused");
        const onEnded = () => onStateChange?.("ended");
        const onTime = () => onTimeUpdate?.(v.currentTime, v.duration || 0);

        v.addEventListener("loadedmetadata", onLoaded);
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);
        v.addEventListener("ended", onEnded);
        v.addEventListener("timeupdate", onTime);
        v.load();

        return () => {
          v.removeEventListener("loadedmetadata", onLoaded);
          v.removeEventListener("play", onPlay);
          v.removeEventListener("pause", onPause);
          v.removeEventListener("ended", onEnded);
          v.removeEventListener("timeupdate", onTime);
        };
      }, [videoUrl]);

      React.useImperativeHandle(ref, () => ({
        play: () => {
          videoRef.current?.play().catch(() => {});
        },
        pause: () => {
          videoRef.current?.pause();
        },
        seek: (s: number) => {
          if (videoRef.current) videoRef.current.currentTime = s;
        },
        setVolume: (v: number) => {
          if (videoRef.current) videoRef.current.volume = v / 100;
        },
        mute: () => {
          if (videoRef.current) videoRef.current.muted = true;
        },
        unmute: () => {
          if (videoRef.current) videoRef.current.muted = false;
        },
      }));

      return (
        <View
          style={[
            styles.container,
            { width: width as any, height: height as any },
          ]}
        >
          {/* @ts-ignore */}
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
