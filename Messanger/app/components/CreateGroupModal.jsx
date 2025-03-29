import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Switch,
  TextInput,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import APIMethods from "../utils/APImethods";
import localDatabase from "../utils/localDatabaseMethods";
import { useRouter } from "expo-router";
import eventEmitter from "../utils/EventEmitter";

const CreateGroupModal = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  const [groupName, setGroupName] = useState("");
  const [groupHandle, setGroupHandle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isTextError1, setIsTextError1] = useState(false);
  const [isTextError2, setIsTextError2] = useState(false);

  const handleCreateGroupPress = async () => {
    setIsTextError1(false);
    setIsTextError2(false);
    if (!groupName) {
      setIsTextError1(true);
    } else if (!groupHandle && isPublic) {
      setIsTextError2(true);
    } else {
      const success = await APIMethods.createNewGroupAPI(
        groupHandle,
        groupName
      );
      if (success.group_created) {
        console.log("Gruppo creato con successo", success.group_created);
        onClose();

        const newGroupChatId = success.chat_id;

        console.log("🚨Nuovo gruppo ID: ", newGroupChatId);

        // inserisco chat e user nel db locale
        await localDatabase.insertChat(newGroupChatId, groupName);
        // await localDatabase.insertChatAndUsers(newGroupChatId, handle);
        // await localDatabase.insertUsers(handle);
        // Clear the parameter after handling
        router.setParams({
          chatId: newGroupChatId,
          creatingChatWith: undefined,
        });
        router.navigate(`/messages?chatId=${newGroupChatId}`);

        // aggiorno live la lista delle chat
        eventEmitter.emit("newChat", { newChatId: newGroupChatId });
      } else {
        console.log(
          "Errore durante la creazione del gruppo",
          success.group_created
        );
      }
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitleText}>Crea un nuovo gruppo</Text>
          <TextInput
            style={isTextError1 ? styles.textInputError : styles.textInput}
            placeholder="Nome del gruppo"
            placeholderTextColor={isTextError1 ? "#red" : "#ccc"}
            value={groupName}
            onChangeText={setGroupName}
          />
          {isPublic ? (
            <TextInput
              style={isTextError2 ? styles.textInputError : styles.textInput}
              placeholder="Handle del gruppo"
              placeholderTextColor={isTextError2 ? "#red" : "#ccc"}
              value={groupHandle}
              onChangeText={setGroupHandle}
            />
          ) : null}

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 10,
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Text style={styles.isPublicText}>
              {isPublic ? "Pubblico" : "Privato"}
            </Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isPublic ? "#f5dd4b" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setIsPublic}
              value={isPublic}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={onClose}
            >
              <Text style={styles.textStyle}>Indietro</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={handleCreateGroupPress}
            >
              <Text style={styles.textStyle}>Crea gruppo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalView: {
      backgroundColor: theme.modalsBackground,
      borderRadius: 20,
      paddingHorizontal: 50,
      paddingVertical: 20,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    button: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
    },
    buttonOpen: {
      backgroundColor: "#F194FF",
    },
    buttonClose: {
      backgroundColor: "#2196F3",
    },
    textStyle: {
      color: "white",
      fontWeight: "bold",
      textAlign: "center",
    },
    modalText: {
      marginBottom: 15,
      textAlign: "center",
    },
    modalTitleText: {
      marginBottom: 15,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    textInput: {
      width: "100%",
      outlineStyle: "none",
      borderColor: "white",
      borderWidth: 1,
      borderRadius: 12,
      color: "white",
      pointerEvents: "auto",
      marginBottom: 10,
      padding: 10,
    },
    textInputError: {
      width: "100%",
      outlineStyle: "none",
      borderColor: "red",
      borderWidth: 1,
      borderRadius: 12,
      color: "red",
      pointerEvents: "auto",
      marginBottom: 10,
      padding: 10,
    },
    isPublicText: {
      color: theme.text,
    },
  });
}

export default CreateGroupModal;
