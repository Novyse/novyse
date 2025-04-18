import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
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

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("react-native-webrtc").RTCView;
}

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
    // Crea un elemento audio per riprodurre lo stream (solo per web)
    if (Platform.OS === "web") {
      try {
        // AUDIO
        const audioElement = new Audio();
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        audioElement.muted = true;
        document.body.appendChild(audioElement);

        // VIDEO
        const videoElement =
          document.getElementById(`video-${participantId}`) ||
          document.createElement("video");
        videoElement.id = `video-${participantId}`;
        videoElement.srcObject = stream;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.muted = true; // true se vuoi silenziare il proprio video
        videoElement.style.width = "320px";
        videoElement.style.height = "180px";
        document.body.appendChild(videoElement);
      } catch (error) {
        console.error(`Errore gestione stream per ${participantId}:`, error);
      }
    } else {
      console.log("Non so come sei arrivato qui 🚨");
      // Per mobile, usa le API native per la riproduzione
      // React Native gestisce automaticamente la riproduzione dell'audio WebRTC
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
      <View style={styles.profilesContainer}>
        {profilesInVocalChat.length > 0 ? (
          <>
            {/* Riquadri per gli utenti */}
            {profilesInVocalChat.map((profile) => (
              <Pressable key={profile.from} style={styles.profile}>
                <View style={styles.videoContainer}>
                  {profile.from === WebRTC.myId && WebRTC.localStream ? (
                    <RTCView
                      stream={WebRTC.localStream}
                      style={styles.videoStream}
                      objectFit="cover"
                      muted={true}
                    />
                  ) : WebRTC.remoteStreams[profile.from] ? (
                    <RTCView
                      stream={WebRTC.remoteStreams[profile.from]}
                      style={styles.videoStream}
                      objectFit="cover"
                      muted={false}
                    />
                  ) : null}
                  <Text style={styles.profileText}>{profile.handle}</Text>
                </View>
              </Pressable>
            ))}

            {/* Riquadro per la condivisione schermo */}
            {screenShareStream && (
              <Pressable style={styles.profile}>
                <View style={styles.videoContainer}>
                  <RTCView
                    stream={screenShareStream}
                    style={styles.videoStream}
                    objectFit="cover"
                    muted={true}
                  />
                  <Text style={styles.profileText}>Schermo condiviso</Text>
                </View>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.profileText}>Nessun utente nella chat</Text>
        )}
      </View>

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
    profilesContainer: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap", // Permette agli elementi di andare a capo se necessario
      justifyContent: "space-around",
      alignItems: "flex-start",
      gap: 15,
    },
    profile: {
      backgroundColor: "black",
      borderRadius: 10,
      flexGrow: 1,
      maxWidth: "30%",
      minHeight: 100,
      justifyContent: "center",
      alignItems: "center",
      aspectRatio: 16 / 9, // Add this to maintain ratio
      overflow: "hidden",
    },
    profileText: {
      color: "white",
      fontSize: 16,
      position: "absolute",
      bottom: 10,
      left: 10,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      padding: 5,
      margin: 0,
      borderRadius: 5,
      alignContent: "center",
    },
    videoContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
      aspectRatio: 16 / 9,
      overflow: "hidden",
      borderRadius: 10,
    },
    videoStream: {
    },
  });
