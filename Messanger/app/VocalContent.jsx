import React, { useState, useContext, useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
// Assumendo che questi import siano corretti per il tuo progetto
// import WebSocketMethods from "./utils/webSocketMethods";
import VocalContentBottomBar from "./components/VocalContentBottomBar";

const VocalContent = ({ selectedChat, chatId }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();
  const [profilesInVocalChat, setProfilesInVocalChat] = useState([]);

  // cosa succede quando premo il pulsante per entrare nella chat vocale
  const handleSelfJoined = () => {
    setProfilesInVocalChat([...profilesInVocalChat, "placeholder"]);
  }

  // cosa succede quando premo il pulsante per abbandonare la chat vocale
  const handleSelfLeft = () => {
    
  }

  return (
    <View style={styles.container}>
      <View style={styles.profilesContainer}>
        {/* Usa map() invece di forEach() */}
        {profilesInVocalChat.map((element, index) => (
          // Aggiungi una prop 'key' univoca per ogni elemento della lista
          <Pressable key={index} style={styles.profile}>
            {/* Puoi usare 'element' se ti serve, es: <Text>Profilo {element}</Text> */}
            <Text style={styles.profileText}>Entra</Text>
          </Pressable>
        ))}

        {/* Codice commentato originale */}
        {/* <Pressable style={styles.profile}>
          <Text style={styles.profileText}>Entra</Text>
        </Pressable>
        <Pressable style={styles.profile}>
          <Text style={styles.profileText}>Esci</Text>
        </Pressable>
        <Pressable style={styles.profile}>
          <Text style={styles.profileText}>Ciao</Text>
        </Pressable> */}
      </View>

      <VocalContentBottomBar chatId={chatId} selfJoined={handleSelfJoined} selfLeft={handleSelfLeft}/>
    </View>
  );
};

export default VocalContent;

// La funzione createStyle rimane invariata
function createStyle(theme) {
  return StyleSheet.create({
    profilesContainer: {
      flex: 1,
      flexDirection: "row", // Gli elementi si disporranno in riga
      justifyContent: 'space-around', // Aggiunto per spaziare meglio i bottoni
      alignItems: 'flex-start', // Allinea all'inizio
      gap: 15, // Mantiene lo spazio tra elementi
    },
    container: {
      flex: 1,
      flexDirection: "column",
      padding: 15,
      gap: 15,
    },
    profile: {
      backgroundColor: "black", // Sfondo nero come da esempio
      borderRadius: 10,
      flexGrow: 1, // Permette ai pressable di crescere e occupare spazio
      maxWidth: '30%', // Limita la larghezza massima per evitare che uno occupi tutto
      height: 100, // Altezza fissa come da esempio
      // Aggiunto per centrare il testo nel Pressable (opzionale)
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileText: {
      color: theme ? theme.text : 'white', // Usa il tema se disponibile, altrimenti bianco
      // Aggiunto stile di base per il testo
      fontSize: 16,
    },
  });
}