import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Switch } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

const CreateGroupModal = (props) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [groupName, setGroupName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleCreateGroup = () => {
    props.onClose();
  };

  return (
    <View style={styles.container}>
      <Modal animationType="slide" transparent={true} visible={props.visible}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Hello World!</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isPublic ? "#f4f3f4" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setIsPublic}
              value={isPublic}
            />
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={props.onClose}
            >
              <Text style={styles.textStyle}>Hide Modal</Text>
            </Pressable>
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
      minWidth: "30%",
      minHeight: "20%",
      maxWidth: "90%",
      maxHeight: "80%",
      margin: 20,
      backgroundColor: "white",
      borderRadius: 20,
      padding: 35,
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
  });

export default CreateGroupModal;
