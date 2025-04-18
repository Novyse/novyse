import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, View} from "react-native";
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
  const [screenShareStream, setScreenShareStream] = useState(null);

  useEffect(() => {
    WebRTC.startLocalStream();
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
    if (Platform.OS === "web") {
      try {
        // Rimuovi eventuali elementi esistenti per evitare duplicati
        const existingAudio = document.getElementById(`audio-${participantId}`);
        const existingVideo = document.getElementById(`video-${participantId}`);
        if (existingAudio) existingAudio.remove();
        if (existingVideo) existingVideo.remove();
  
        // AUDIO - muta solo se è il proprio stream
        const audioElement = new Audio();
        audioElement.id = `audio-${participantId}`;
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        audioElement.muted = participantId === WebRTC.myId; // Muta solo il proprio audio
        document.body.appendChild(audioElement);
  
        // VIDEO
        const videoElement = document.createElement("video");
        videoElement.id = `video-${participantId}`;
        videoElement.srcObject = stream;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.muted = true; // Video sempre mutato per evitare echo
        videoElement.style.width = "320px";
        videoElement.style.height = "180px";
        document.body.appendChild(videoElement);
  
      } catch (error) {
        console.error(`Errore gestione stream per ${participantId}:`, error);
      }
    } else {
      console.log("Stream gestito automaticamente da React Native");
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

  const handleScreenShare = async () => {
    if (!screenShareStream) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        setScreenShareStream(stream);

        // Quando l'utente ferma la condivisione dal browser
        stream.getVideoTracks()[0].onended = () => setScreenShareStream(null);
      } catch (err) {
        console.error("Errore durante la condivisione schermo:", err);
      }
    } else {
      // Ferma la condivisione
      screenShareStream.getTracks().forEach((track) => track.stop());
      setScreenShareStream(null);
    }
  };

  return (
    <View style={styles.container}>
      <VocalMembersLayout 
        profiles={profilesInVocalChat}
        WebRTC={WebRTC}
        screenShareStream={screenShareStream}
        theme={theme}
      />
      
      <VocalContentBottomBar
        chatId={chatId}
        selfJoined={selfJoined}
        selfLeft={selfLeft}
        WebRTC={WebRTC}
        onScreenShare={handleScreenShare}
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
