import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import VocalContentBottomBar from "./components/VocalContentBottomBar";
import APIMethods from "./utils/APImethods";
import localDatabase from "./utils/localDatabaseMethods";
import eventEmitter from "./utils/EventEmitter";

const VocalContent = ({ selectedChat, chatId }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();
  const [profilesInVocalChat, setProfilesInVocalChat] = useState([]);

  const getVocalMembers = async () => {
    const usersInfo = await APIMethods.retrieveVocalUsers(chatId);
    setProfilesInVocalChat(usersInfo);
  };

  useEffect(() => {
    getVocalMembers();

    eventEmitter.on("member_joined_comms", handleMemberJoined);
    eventEmitter.on("member_left_comms", handleMemberLeft);

    return () => {
      eventEmitter.off("member_joined_comms", handleMemberJoined);
      eventEmitter.off("member_left_comms", handleMemberLeft);
    };
  }, []);

  // Gestione dell'ingresso nella chat vocale
  const handleMemberJoined = async (data) => {
    console.log(data);
    if (data.chat_id == chatId) {
      setProfilesInVocalChat((prev) => [...prev, data]);
    }
  };

  // Gestione dell'uscita dalla chat vocale
  const handleMemberLeft = (data) => {
    console.log(data);
    if (data.chat_id == chatId) {
      
      // Rimuovo l'ultimo profilo aggiunto (puoi modificare la logica di rimozione)
      setProfilesInVocalChat(
        (prevProfiles) =>
          // Filtra l'array precedente
          prevProfiles.filter((profile) => profile.comms_id !== data.comms_id)
        // Mantieni solo i profili il cui comms_id NON corrisponde a quello da rimuovere
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profilesContainer}>
        {profilesInVocalChat.length > 0 ? (
          profilesInVocalChat.map((profile) => (
            <Pressable key={profile.comms_id} style={styles.profile}>
              <Text style={styles.profileText}>{profile.handle}</Text>
              <Text style={[styles.profileText, { fontSize: 12 }]}>
                {profile.status}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.profileText}>Nessun utente nella chat</Text>
        )}
      </View>

      <VocalContentBottomBar
        chatId={chatId}
        memberJoined={handleMemberJoined}
        memberLeft={handleMemberLeft}
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
