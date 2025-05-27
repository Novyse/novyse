import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useAudio } from "@/context/AudioContext";
import VocalContentBottomBar from "./components/VocalContentBottomBar";
import eventEmitter from "./utils/EventEmitter";
import { Platform } from "react-native";
import VocalMembersLayout from "./components/VocalMembersLayout";
import multiPeerWebRTCManager from "./utils/webrtcMethods";

import utils from "./utils/webrtc/utils";
const { get } = utils;

const VocalContent = ({ selectedChat, chatId }) => {
  
  const { theme } = useContext(ThemeContext);
  const audioContext = useAudio();
  const styles = createStyle(theme);

  const [profilesInCommsChat, setProfilesInCommsChat] = useState([]);
  const [activeStreams, setActiveStreams] = useState({}); // { participantId: { stream, userData, streamType } }
  
  useEffect(() => {
    // Set audio context reference in WebRTC manager when component mounts
    multiPeerWebRTCManager.setAudioContext(audioContext);
  }, [audioContext]);

  useEffect(() => {

    // Registra i listeners PRIMA di fare qualsiasi chiamata API
    eventEmitter.on("member_joined_comms", handleMemberJoined);
    eventEmitter.on("member_left_comms", handleMemberLeft);
    eventEmitter.on("stream_added_or_updated", handleStreamUpdate);    
    
    const getMembers = async () => {
      const members = await get.commsMembers(chatId);
      setProfilesInCommsChat(members);
    }

    getMembers();
    
    return () => {
      eventEmitter.off("member_joined_comms", handleMemberJoined);
      eventEmitter.off("member_left_comms", handleMemberLeft);
      eventEmitter.off("stream_added_or_updated", handleStreamUpdate);
    };
  }, [chatId]);

  // Gestione globale degli stream
  const handleStreamUpdate = (data) => {
    const { participantId, stream, streamType, userData } = data;
    
    console.log(`[VocalContent] Stream update for ${participantId}:`, {
      streamType,
      hasAudio: stream?.getAudioTracks().length > 0,
      hasVideo: stream?.getVideoTracks().length > 0,
      userData
    });    // Aggiorna lo stato degli stream attivi
    setActiveStreams(prev => ({
      ...prev,
      [participantId]: {
        stream,
        userData,
        streamType,
        hasAudio: stream?.getAudioTracks().length > 0,
        hasVideo: stream?.getVideoTracks().length > 0
      }
    }));

  };


    
  // Gestione dell'ingresso nella chat vocale
  const handleMemberJoined = async (data) => {
    console.log('[VocalContent] handleMemberJoined called with:', data);
    console.log('[VocalContent] Current chatId:', chatId);
    console.log('[VocalContent] Current profiles count:', profilesInCommsChat.length);
    
    // Solo se la view corretta è aperta
    if (data.chat_id == chatId) {
      console.log('[VocalContent] Adding member to profiles');
      setProfilesInCommsChat((prev) => {
        console.log('[VocalContent] Previous profiles:', prev);
        const newProfiles = [...prev, data];
        console.log('[VocalContent] New profiles:', newProfiles);
        return newProfiles;
      });
    } else {
      console.log('[VocalContent] Member joined different chat, ignoring');
    }
  };

  // Gestione dell'uscita dalla chat vocale
  const handleMemberLeft = async (data) => {
    // Solo se la view corretta è aperta
    if (data.chat_id == chatId) {
      // Rimuovo il profilo
      setProfilesInCommsChat((prevProfiles) =>
        prevProfiles.filter((profile) => profile.from !== data.from)
      );

      // Rimuovo anche lo stream associato
      setActiveStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[data.from];
        return newStreams;
      });

      // Cleanup elementi DOM per Web
      if (Platform.OS === "web") {
        const container = document.getElementById(`media-container-${data.from}`);
        if (container) {
          container.remove();
        }
      }
    }
  };
  return (
    <View style={styles.container}>
      <VocalMembersLayout
        profiles={profilesInCommsChat}
        activeStreams={activeStreams}
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
