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
        audioElement.muted = false;
        document.body.appendChild(audioElement);

        // VIDEO
        const videoElement =
          document.getElementById(`video-${participantId}`) ||
          document.createElement("video");
        videoElement.id = `video-${participantId}`;
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.muted = false; // true se vuoi silenziare il proprio video
        videoElement.style.width = "320px";
        videoElement.style.height = "180px";
        document.body.appendChild(videoElement);
      } catch (error) {
        console.error(`Errore gestione stream per ${participantId}:`, error);
      }
    } else {
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

  return (
    <View style={styles.container}>
      <View style={styles.profilesContainer}>
        {profilesInVocalChat.length > 0 ? (
          profilesInVocalChat.map((profile) => (
            <Pressable key={profile.from} style={styles.profile}>
              <View style={{ width: 300, height: 180 }}>
                {profile.from === WebRTC.myId && WebRTC.localStream ? (
                  Platform.OS === "web" ? (
                    <RTCView
                      stream={WebRTC.localStream}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 10,
                      }}
                      objectFit="cover"
                    />
                  ) : (
                    <RTCView
                      streamURL={WebRTC.localStream.toURL()}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 10,
                      }}
                      objectFit="cover"
                    />
                  )
                ) : WebRTC.remoteStreams[profile.from] ? (
                  Platform.OS === "web" ? (
                    <RTCView
                      stream={WebRTC.remoteStreams[profile.from]}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 10,
                      }}
                      objectFit="cover"
                    />
                  ) : (
                    <RTCView
                      streamURL={WebRTC.remoteStreams[profile.from].toURL()}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 10,
                      }}
                      objectFit="cover"
                    />
                  )
                ) : null}
                <Text style={styles.profileText}>{profile.handle}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={styles.profileText}>Nessun utente nella chat</Text>
        )}
      </View>

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

function createStyle(theme) {
  return StyleSheet.create({
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
      padding: 10, // Aggiunto padding interno
      flexGrow: 1,
      maxWidth: "30%",
      minHeight: 100, // Usato minHeight invece di height fisso
      justifyContent: "center",
      alignItems: "center",
    },
    profileText: {
      color: theme?.text || "white",
      fontSize: 16,
      textAlign: "center",
    },
  });
}
