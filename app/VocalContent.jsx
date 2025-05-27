import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import VocalContentBottomBar from "./components/VocalContentBottomBar";
import eventEmitter from "./utils/EventEmitter";
import { Platform } from "react-native";
import VocalMembersLayout from "./components/VocalMembersLayout";

import utils from "./utils/webrtc/utils";
const { get } = utils;

const VocalContent = ({ selectedChat, chatId }) => {
  
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);


  const [profilesInCommsChat, setProfilesInCommsChat] = useState([]);

  useEffect(async () => {
    setProfilesInCommsChat(await get.commsMembers(chatId));
    
    eventEmitter.on("member_joined_comms", handleMemberJoined);
    eventEmitter.on("member_left_comms", handleMemberLeft);
    return () => {
      eventEmitter.off("member_joined_comms", handleMemberJoined);
      eventEmitter.off("member_left_comms", handleMemberLeft);
    };
  }, []);



  // permette la riproduzione audio lato UI
  function handleRemoteStream(participantId, stream) {
    if (Platform.OS === "web") {
      try {

        // AUDIO
        if (stream.getAudioTracks().length > 0) {
          let audioElement = document.getElementById(`audio-${participantId}`);
          if (!audioElement) {
            audioElement = document.createElement("audio");
            audioElement.id = `audio-${participantId}`;
            audioElement.autoplay = true;
            audioElement.controls = true;
            container.appendChild(audioElement);
          }
          const audioStream = new MediaStream([stream.getAudioTracks()[0]]);
          audioElement.srcObject = audioStream;
          audioElement.muted = participantId === WebRTC.myId;
        }

        // VIDEO
        if (stream.getVideoTracks().length > 0) {
          let videoElement = document.getElementById(`video-${participantId}`);
          if (!videoElement) {
            videoElement = document.createElement("video");
            videoElement.id = `video-${participantId}`;
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.style.width = "320px";
            videoElement.style.height = "180px";
            container.appendChild(videoElement);
          }
          const videoStream = new MediaStream([stream.getVideoTracks()[0]]);
          videoElement.srcObject = videoStream;
          videoElement.muted = participantId === WebRTC.myId;

          videoElement
            .play()
            .catch((e) => console.error("Error playing video:", e));
        }
      } catch (error) {
        console.error(`Error handling stream for ${participantId}:`, error);
      }
    }
  }

  // Gestione dell'ingresso nella chat vocale
  const handleMemberJoined = async (data) => {

    // Solo se la view corretta è aperta
    if (data.chat_id == chatId){
      setProfilesInCommsChat((prev) => [...prev, data]);
    }

  };

  // Gestione dell'uscita dalla chat vocale
  const handleMemberLeft = async (data) => {

    // Solo se la view corretta è aperta
    if (data.chat_id == chatId) {

      // Rimuovo l'ultimo profilo aggiunto (puoi modificare la logica di rimozione)
      setProfilesInCommsChat((prevProfiles) =>
        // Filtra l'array precedente
        prevProfiles.filter((profile) => profile.from !== data.from)
        // Mantieni solo i profili il cui from NON corrisponde a quello da rimuovere
      );
    }


  };

  return (
    <View style={styles.container}>
      <VocalMembersLayout
        profiles={profilesInCommsChat}
        theme={theme}
      />

      <VocalContentBottomBar
        chatId={chatId}
      />
    </View>
  );
};

export default VocalContent;

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "column",
      padding: 15,
      gap: 15,
    },
  });
