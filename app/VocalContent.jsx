import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import VocalContentBottomBar from "./components/VocalContentBottomBar";
import APIMethods from "./utils/APImethods";
import eventEmitter from "./utils/EventEmitter";
import { useAudioPlayer } from "expo-audio";
import sounds from "./utils/sounds";
import multiPeerWebRTCManager from "./utils/webrtcMethods";
import localDatabase from "./utils/localDatabaseMethods";
import { Platform } from "react-native";
import VocalMembersLayout from "./components/VocalMembersLayout";

const VocalContent = ({ selectedChat, chatId }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();
  const WebRTC = multiPeerWebRTCManager;

  const comms_join_vocal = useAudioPlayer(sounds.comms_join_vocal);
  const comms_leave_vocal = useAudioPlayer(sounds.comms_leave_vocal);

  const [profilesInVocalChat, setProfilesInVocalChat] = useState([]);

  useEffect(() => {
    getVocalMembers();

    eventEmitter.on("member_joined_comms", handleMemberJoined);
    eventEmitter.on("member_left_comms", handleMemberLeft);

    return () => {
      eventEmitter.off("member_joined_comms", handleMemberJoined);
      eventEmitter.off("member_left_comms", handleMemberLeft);
    };
  }, []);

  // ottiene chi è dentro la vocal chat
  const getVocalMembers = async () => {
    console.log("sto prendendo i membri 1...");
    if (chatId != WebRTC.chatId) {
      console.log("sto prendendo i membri 2...");
      const usersInfo = await APIMethods.retrieveVocalUsers(chatId);
      setProfilesInVocalChat(usersInfo);
    } else {
      console.log("sto prendendo i membri 3...");
      console.log(WebRTC.userData);
      const userList = Object.values(WebRTC.userData);
      const localUserHandle = await localDatabase.fetchLocalUserHandle();
      userList.push({ handle: localUserHandle, from: WebRTC.myId });
      setProfilesInVocalChat(userList);
    }
  };

  // permette la riproduzione audio lato UI
  function handleRemoteStream(participantId, stream) {
    console.log(`handleRemoteStream called for ${participantId}`, {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
    });

    if (Platform.OS === "web") {
      try {
        // Create container for video/audio elements if it doesn't exist
        let container = document.getElementById("streams-container");
        if (!container) {
          container = document.createElement("div");
          container.id = "streams-container";
          document.body.appendChild(container);
        }

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
          // Only mute if it's our own audio
          audioElement.muted = participantId === WebRTC.myId;
          console.log(
            `Audio element created for ${participantId}, muted: ${audioElement.muted}`
          );
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
          // Only mute audio for our own video
          videoElement.muted = participantId === WebRTC.myId;
          console.log(
            `Video element created for ${participantId}, muted: ${videoElement.muted}`
          );

          // Force play the video
          videoElement
            .play()
            .catch((e) => console.error("Error playing video:", e));
        }
      } catch (error) {
        console.error(`Error handling stream for ${participantId}:`, error);
      }
    }
  }

  // quando io entro in una room
  const selfJoined = async (data) => {
    await WebRTC.regenerate(
      data.from,
      chatId,
      null,
      handleRemoteStream,
      null,
      null
    );
    await handleMemberJoined(data);
    WebRTC.existingUsers(profilesInVocalChat);
  };

  // quando io esco in una room
  const selfLeft = async (data) => {
    await handleMemberLeft(data);
    WebRTC.closeAllConnections();
    WebRTC.closeLocalStream();
  };

  // Gestione dell'ingresso nella chat vocale
  const handleMemberJoined = async (data) => {
    if (data.chat_id == chatId) {
      setProfilesInVocalChat((prev) => [...prev, data]);
    }
    if (WebRTC.chatId == chatId) {
      comms_join_vocal.play();
    }
  };

  // Gestione dell'uscita dalla chat vocale
  const handleMemberLeft = async (data) => {
    if (data.chat_id == chatId) {
      // Rimuovo l'ultimo profilo aggiunto (puoi modificare la logica di rimozione)
      setProfilesInVocalChat(
        (prevProfiles) =>
          // Filtra l'array precedente
          prevProfiles.filter((profile) => profile.from !== data.from)
        // Mantieni solo i profili il cui from NON corrisponde a quello da rimuovere
      );
    }
    if (WebRTC.chatId == chatId) {
      comms_leave_vocal.play();
    }
  };

  return (
    <View style={styles.container}>
      <VocalMembersLayout
        profiles={profilesInVocalChat}
        WebRTC={WebRTC}
        theme={theme}
      />

      <VocalContentBottomBar
        chatId={chatId}
        selfJoined={selfJoined}
        selfLeft={selfLeft}
        WebRTC={WebRTC}
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
