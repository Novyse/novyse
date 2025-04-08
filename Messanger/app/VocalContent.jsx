import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import VocalContentBottomBar from "./components/VocalContentBottomBar";

const VocalContent = ({ selectedChat, chatId }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();
  const [profilesInVocalChat, setProfilesInVocalChat] = useState([]);

  // Gestione dell'ingresso nella chat vocale
  const handleSelfJoined = () => {
    // Aggiungo un oggetto più significativo invece di un semplice placeholder
    const newProfile = {
      id: Date.now(), // ID univoco basato sul timestamp
      name: "Utente " + (profilesInVocalChat.length + 1), // Nome dinamico
      status: "joined"
    };
    setProfilesInVocalChat(prev => [...prev, newProfile]);
  };

  // Gestione dell'uscita dalla chat vocale
  const handleSelfLeft = () => {
    // Rimuovo l'ultimo profilo aggiunto (puoi modificare la logica di rimozione)
    setProfilesInVocalChat(prev => prev.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.profilesContainer}>
        {profilesInVocalChat.length > 0 ? (
          profilesInVocalChat.map((profile) => (
            <Pressable 
              key={profile.id} 
              style={styles.profile}
              onPress={() => console.log(`Pressed ${profile.name}`)} // Azione opzionale
            >
              <Text style={styles.profileText}>{profile.name}</Text>
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
        selfJoined={handleSelfJoined} 
        selfLeft={handleSelfLeft}
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