import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useAudio } from "@/context/AudioContext";
import VocalContentBottomBar from "./components/comms/VocalContentBottomBar";
import eventEmitter from "./utils/EventEmitter";
import { Platform } from "react-native";
import VocalMembersLayout from "./components/comms/VocalMembersLayout";
import multiPeerWebRTCManager from "./utils/webrtcMethods";

import utils from "./utils/webrtc/utils";
const { get, check } = utils;

const VocalContent = ({ selectedChat, chatId }) => {
    const { theme } = useContext(ThemeContext);
  const audioContext = useAudio();
  const styles = createStyle(theme);

  const [profilesInCommsChat, setProfilesInCommsChat] = useState([]);
  const [activeStreams, setActiveStreams] = useState({}); // { participantId: { stream, userData, streamType } }
  const [videoStreamKeys, setVideoStreamKeys] = useState({}); // For forcing RTCView re-render

  useEffect(() => {
    // Set audio context reference in WebRTC manager when component mounts
    multiPeerWebRTCManager.setAudioContext(audioContext);
  }, [audioContext]); // da capire se questa parte si può far esplodere @SamueleOrazioDurante @Matt3opower

  // Add effect to monitor comms status and clear streams when user leaves comms
  useEffect(() => {
    let wasInComms = check.isInComms();
    
    const interval = setInterval(async () => {
      const currentlyInComms = check.isInComms();
      
      if (!currentlyInComms) {
        // Clear all active streams when user is no longer in comms
        // but keep the profiles so other users are still visible
        setActiveStreams({});
        
        // Se l'utente era in comms e ora non lo è più, aggiorna la lista dei membri
        if (wasInComms && !currentlyInComms) {
          console.log('[VocalContent] User left comms, updating member list from API');
          try {
            // Aspetta un momento per permettere al server di aggiornarsi
            setTimeout(async () => {
              const members = await get.commsMembers(chatId);
              setProfilesInCommsChat(members);
            }, 1000);
          } catch (error) {
            console.error('[VocalContent] Error updating members after leaving comms:', error);
          }
        }
        
        // Aggiorna solo lo stato speaking di tutti gli utenti a false
        setProfilesInCommsChat(prev => 
          prev.map(profile => ({
            ...profile,
            is_speaking: false
          }))
        );
      }
      
      wasInComms = currentlyInComms;
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {

    // Registra i listeners
    eventEmitter.on("member_joined_comms", handleMemberJoined);
    eventEmitter.on("member_left_comms", handleMemberLeft);    
    eventEmitter.on("stream_added_or_updated", handleStreamUpdate);

    eventEmitter.on("user_started_speaking", handleUserStartedSpeaking);
    eventEmitter.on("user_stopped_speaking", handleUserStoppedSpeaking);
    eventEmitter.on("remote_user_started_speaking", handleRemoteUserStartedSpeaking);
    eventEmitter.on("remote_user_stopped_speaking", handleRemoteUserStoppedSpeaking);
    
    // Listen for mobile camera switch events specifically for Android compatibility
    eventEmitter.on("mobile_camera_switched", handleStreamUpdate);
    
    const getMembers = async () => {
      const members = await get.commsMembers(chatId);
      setProfilesInCommsChat(members);
    }

    getMembers();
    
    return () => {
      eventEmitter.off("member_joined_comms", handleMemberJoined);
      eventEmitter.off("member_left_comms", handleMemberLeft);

      eventEmitter.off("stream_added_or_updated", handleStreamUpdate);

      eventEmitter.off("user_started_speaking", handleUserStartedSpeaking);
      eventEmitter.off("user_stopped_speaking", handleUserStoppedSpeaking);

      eventEmitter.off("remote_user_started_speaking", handleRemoteUserStartedSpeaking);
      eventEmitter.off("remote_user_stopped_speaking", handleRemoteUserStoppedSpeaking);

      eventEmitter.off("mobile_camera_switched", handleStreamUpdate);
    };
  }, [chatId]);

  // Gestione globale degli stream
  const handleStreamUpdate = (data) => {
    // Only update streams if the user is still in comms
    if (!check.isInComms()) {
      console.log('[VocalContent] User not in comms, ignoring stream update');
      
      // Clear all active streams if user is no longer in comms
      setActiveStreams({});
      setVideoStreamKeys({});
      return;
    }

    const { participantId, stream, streamType, userData, timestamp } = data;
    
    console.log(`[VocalContent] Stream update for ${participantId}:`, {
      streamType,
      hasAudio: stream?.getAudioTracks().length > 0,
      hasVideo: stream?.getVideoTracks().length > 0,
      userData,
      timestamp
    });

    // Aggiorna lo stato degli stream attivi
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

    // For Android: Update video stream keys to force RTCView re-render when stream changes
    if (Platform.OS === 'android' && stream?.getVideoTracks().length > 0) {
      setVideoStreamKeys(prev => ({
        ...prev,
        [participantId]: timestamp || Date.now()
      }));
    }

  };

  // Speech detection handlers
  const handleUserStartedSpeaking = () => {
    if(check.isInComms()) {
      console.log('[VocalContent] Current user started speaking');
      
      // Aggiorna lo stato is_speaking per l'utente corrente in profilesInCommsChat
      setProfilesInCommsChat(prev => 
        prev.map(profile => 
          profile.from === get.myPartecipantId() 
            ? { ...profile, is_speaking: true }
            : profile
        )
      );
    }
  };

  const handleUserStoppedSpeaking = () => {
    if(check.isInComms()) {
      console.log('[VocalContent] Current user stopped speaking');
      
      // Aggiorna lo stato is_speaking per l'utente corrente in profilesInCommsChat
      setProfilesInCommsChat(prev => 
        prev.map(profile => 
          profile.from === get.myPartecipantId() 
            ? { ...profile, is_speaking: false }
            : profile
        )
      );
    }
  };
  const handleRemoteUserStartedSpeaking = (data) => {
    // Only process if user is in comms and event is for the correct chat
    if (!check.isInComms()) {
      console.log('[VocalContent] User not in comms, ignoring remote speaking event');
      return;
    }
    
    // Solo se il remote user è nella chat in cui sono e non è l'utente locale
    if (data.chatId === chatId && data.chatId === get.commsId() && data.id !== get.myPartecipantId()) {
      console.log('[VocalContent] Remote user started speaking:', data);
      
      // Aggiorna lo stato is_speaking per l'utente remoto in profilesInCommsChat
      setProfilesInCommsChat(prev => 
        prev.map(profile => 
          profile.from === data.id 
            ? { ...profile, is_speaking: true }
            : profile
        )
      );
    }
  };
  const handleRemoteUserStoppedSpeaking = (data) => {
    // Only process if user is in comms and event is for the correct chat
    if (!check.isInComms()) {
      console.log('[VocalContent] User not in comms, ignoring remote speaking event');
      return;
    }
    
    // Solo se il remote user è nella chat in cui sono e non è l'utente locale
    if (data.chatId === chatId && data.chatId === get.commsId() && data.id !== get.myPartecipantId()) {
      console.log('[VocalContent] Remote user stopped speaking:', data);
      
      // Aggiorna lo stato is_speaking per l'utente remoto in profilesInCommsChat
      setProfilesInCommsChat(prev => 
        prev.map(profile => 
          profile.from === data.id 
            ? { ...profile, is_speaking: false }
            : profile
        )
      );
    }
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
    }  };

  return (
    <View style={styles.container}>
      <VocalMembersLayout
        profiles={profilesInCommsChat}
        activeStreams={activeStreams}
        videoStreamKeys={videoStreamKeys}
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
