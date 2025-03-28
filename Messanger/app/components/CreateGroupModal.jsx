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

const CreateGroupModal = (props) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [groupName, setGroupName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleCreateGroup = () => {
    console.log("🟢🟢🟢", isPublic, groupName);
    props.onClose();
  };

  return (
    <View>
      <Modal animationType="slide" transparent={true} visible={props.visible}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitleText}>Crea un nuovo gruppo</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nome del gruppo"
              placeholderTextColor="#ccc"
              value={groupName}
              onChangeText={setGroupName}
            />
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: 10,
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Text style={styles.isPublicText}>{isPublic ? "Pubblico" : "Privato"}</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={isPublic ? '#f5dd4b' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setIsPublic}
                value={isPublic}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={props.onClose}
              >
                <Text style={styles.textStyle}>Indietro</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.buttonClose]} onPress={handleCreateGroup}>
                <Text style={styles.textStyle}>Crea gruppo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
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
    isPublicText: {
      color: theme.text,
    }
  });

export default CreateGroupModal;
