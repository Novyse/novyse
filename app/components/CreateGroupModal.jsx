import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Switch,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import gateway from "../utils/backend-services/api-gateway";
import localDatabase from "../utils/localDatabaseMethods";
import Database from "../utils/storage/database";
import { useRouter } from "expo-router";
import eventEmitter from "../utils/EventEmitter";
import StatusMessage from "./StatusMessage";
import InputDeviceDropdown from "./settings/vocal-chat/InputDeviceDropdown";

const CreateGroupModal = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  const [groupName, setGroupName] = useState("");
  const [groupHandle, setGroupHandle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isTextError1, setIsTextError1] = useState(false);
  const [isTextError2, setIsTextError2] = useState(false);
  const [error, setError] = useState(""); // <-- Added error state

  // Add new state variables for handle availability check
  const [groupHandleAvailable, setGroupHandleAvailable] = useState(null);
  const [isHandleLoading, setIsHandleLoading] = useState(false);
  const [handleTimer, setHandleTimer] = useState(null);

  // Add state for selected chat type
  const [selectedChatType, setSelectedChatType] = useState("GROUP");

  // Options for chat type dropdown
  const chatTypeOptions = [
    { label: "Group", value: "GROUP" },
    { label: "Channel", value: "CHANNEL" },
    { label: "Forum", value: "FORUM" },
  ];

  // Get dynamic labels based on selected chat type
  const getNamePlaceholder = () => {
    switch (selectedChatType) {
      case "GROUP":
        return "Group Name";
      case "CHANNEL":
        return "Channel Name";
      case "FORUM":
        return "Forum Name";
      default:
        return "Name";
    }
  };

  const getHandlePlaceholder = () => {
    switch (selectedChatType) {
      case "GROUP":
        return "Group Handle";
      case "CHANNEL":
        return "Channel Handle";
      case "FORUM":
        return "Forum Handle";
      default:
        return "Handle";
    }
  };

  // funzione per resettare tutti i campi (poi magna la gestisci come vuoi, io preferisco così :)  )
  const resetFields = () => {
    setGroupName("");
    setGroupHandle("");
    setIsPublic(false);
    setIsTextError1(false);
    setIsTextError2(false);
    setGroupHandleAvailable(null);
    setIsHandleLoading(false);
    setSelectedChatType("GROUP");
  };

  // Handle change function for group handle with availability check
  const handleGroupHandleChange = (value) => {
    setGroupHandle(value);
    setIsTextError2(false);

    if (value.length >= 3) {
      setIsHandleLoading(true);
      setGroupHandleAvailable(null);

      // Clear any existing timer
      if (handleTimer) clearTimeout(handleTimer);

      // Set new timer to check availability after typing stops
      const timer = setTimeout(async () => {
        const { success, free } = await gateway.check.handle(value);
        if (success) {
          setGroupHandleAvailable(free);
          setIsHandleLoading(false);
        } else {
          setGroupHandleAvailable(false);
          setIsHandleLoading(false);
        }
      }, 1000);

      setHandleTimer(timer);
    } else {
      // Reset if less than 3 characters
      setGroupHandleAvailable(null);
      setIsHandleLoading(false);
      if (handleTimer) clearTimeout(handleTimer);
    }
  };

  const handleCreateGroupPress = async () => {
    setError("");
    if (!groupName) {
      setError(`The ${selectedChatType.toLowerCase()} name is required`);
      return;
    }
    if (!groupHandle && isPublic) {
      setError(
        `The ${selectedChatType.toLowerCase()} handle is required for public chats`
      );
      return;
    }
    if (isPublic && groupHandleAvailable === false) {
      setError("Handle already in use");
      return;
    }
    let response = null;
    if (isPublic) {
      response = await gateway.chat.create(
        selectedChatType,
        [],
        groupName,
        groupHandle
      );
    } else {
      response = await gateway.chat.create(
        selectedChatType,
        [],
        groupName,
        undefined
      );
    }

    const { success, chat } = response;
    if (success) {
      console.log("Chat created successfully", chat);

      resetFields();
      onClose();

      // inserisco chat e user nel db locale
      const database = await Database.create();
      await database.addChat(chat);
      // await localDatabase.insertUsers(handle);
      // Clear the parameter after handling
      router.navigate(`/chat/${chat.uuid}`);

      // Aggiorno lista chat @SamueleOrazioDurante
    } else {
      console.error("Error during chat creation");
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitleText}>Create a new chat</Text>

          <StatusMessage type="error" text={error} />

          <TextInput
            style={[styles.textInput, error && styles.textInputError]}
            placeholder={getNamePlaceholder()}
            placeholderTextColor={theme.placeholderText || "#ccc"}
            value={groupName}
            onChangeText={setGroupName}
          />

          {isPublic ? (
            <View style={{ width: "100%" }}>
              <View style={styles.inputWrapperContainer}>
                <TextInput
                  style={[
                    isTextError2 ? styles.textInputError : styles.textInput,
                    groupHandleAvailable === false
                      ? styles.handleInputError
                      : null,
                  ]}
                  placeholder={getHandlePlaceholder()}
                  placeholderTextColor={
                    isTextError2
                      ? theme.danger || "#red"
                      : theme.placeholderText || "#ccc"
                  }
                  value={groupHandle}
                  onChangeText={handleGroupHandleChange}
                />
                {isHandleLoading && (
                  <ActivityIndicator
                    size="small"
                    color={theme.primary || "#2399C3"}
                    style={styles.overlayIndicator}
                  />
                )}
              </View>
              {groupHandleAvailable === false && (
                <Text style={styles.handleTextError}>
                  Handle already in use
                </Text>
              )}
            </View>
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
              {isPublic ? "Public" : "Private"}
            </Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isPublic ? "#f5dd4b" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setIsPublic}
              value={isPublic}
            />
          </View>

          {/* Add dropdown for chat type */}
          <InputDeviceDropdown
            label="Chat Type"
            value={selectedChatType}
            options={chatTypeOptions}
            onValueChange={setSelectedChatType}
            theme={theme}
          />

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
              <Text style={styles.textStyle}>Back</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.buttonClose,
                isPublic && !groupHandleAvailable && groupHandle
                  ? styles.buttonDisabled
                  : null,
              ]}
              onPress={handleCreateGroupPress}
              disabled={isPublic && !groupHandleAvailable && groupHandle != ""}
            >
              <Text style={styles.textStyle}>Create Chat</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function createStyle(theme) {
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
      width: "90%", // Add width for better responsiveness
      maxWidth: 400, // Limit max width
    },
    button: {
      borderRadius: 10, // Uniform with dropdown
      padding: 15, // Uniform with dropdown
      elevation: 2,
      backgroundColor: theme.primary || "#007AFF", // Use theme
    },
    buttonOpen: {
      backgroundColor: "#F194FF",
    },
    buttonClose: {
      backgroundColor: theme.primary || "#007AFF", // Use theme
    },
    textStyle: {
      color: theme.text || "white", // Use theme
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
      borderRadius: 10, // Uniform with dropdown
      padding: 15, // Uniform with dropdown
      borderWidth: 1,
      borderColor: theme.borderColor || "#ddd", // Use theme
      backgroundColor: theme.backgroundChatTextInput || "#fff", // Use theme
      color: theme.text, // Use theme
      pointerEvents: "auto",
      marginBottom: 10,
    },
    textInputError: {
      borderColor: theme.danger || "red", // Use theme
      color: theme.danger || "red", // Use theme
    },
    isPublicText: {
      color: theme.text,
    },
    handleInputError: {
      borderColor: theme.danger || "red", // Use theme
    },
    handleTextError: {
      color: theme.danger || "red", // Use theme
      marginTop: 5,
      marginBottom: 10,
    },
    buttonDisabled: {
      backgroundColor: theme.textSecondary || "#999", // Use theme
      opacity: 0.7,
    },
    inputWrapperContainer: {
      position: "relative",
      width: "100%",
    },
    overlayIndicator: {
      position: "absolute",
      right: 15,
      top: "50%",
      marginTop: -16,
    },
  });
}

export default CreateGroupModal;
