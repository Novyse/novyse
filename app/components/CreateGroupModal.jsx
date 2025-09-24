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
          <View style={styles.titleContainer}>
            <Text style={styles.modalTitleText}>Create a new chat</Text>
          </View>

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
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingVertical: 12,
              paddingHorizontal: 4,
              marginBottom: 20,
              backgroundColor: theme.backgroundChatTextInput || "rgba(255, 255, 255, 0.05)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.borderColor || "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Text style={styles.isPublicText}>
              {isPublic ? "Public" : "Private"}
            </Text>
            <Switch
              trackColor={{ 
                false: theme.textSecondary || "#767577", 
                true: theme.primary || "#81b0ff" 
              }}
              thumbColor={isPublic ? "#ffffff" : "#f4f3f4"}
              ios_backgroundColor={theme.textSecondary || "#3e3e3e"}
              onValueChange={setIsPublic}
              value={isPublic}
              style={{
                transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
              }}
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
              marginTop: 8,
              gap: 16,
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
      backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent overlay
    },
    modalView: {
      backgroundColor: theme.modalsBackground,
      borderRadius: 24,
      paddingHorizontal: 32,
      paddingVertical: 28,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
      width: "90%",
      maxWidth: 420,
      borderWidth: 1,
      borderColor: theme.borderColor || "rgba(255, 255, 255, 0.1)",
    },
    titleContainer: {
      alignItems: "center",
      marginBottom: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor || "rgba(255, 255, 255, 0.1)",
      width: "100%",
    },
    button: {
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 24,
      elevation: 3,
      backgroundColor: theme.primary || "#007AFF",
      shadowColor: theme.primary || "#007AFF",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      minWidth: 120,
    },
    buttonOpen: {
      backgroundColor: "#F194FF",
    },
    buttonClose: {
      backgroundColor: theme.primary || "#007AFF",
      transform: [{ scale: 1 }],
    },
    textStyle: {
      color: theme.text || "white",
      fontWeight: "600",
      textAlign: "center",
      fontSize: 16,
    },
    modalTitleText: {
      marginBottom: 24,
      textAlign: "center",
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: 0.5,
    },
    textInput: {
      width: "100%",
      outlineStyle: "none",
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderWidth: 2,
      borderColor: theme.borderColor || "rgba(0, 0, 0, 0.1)",
      backgroundColor: theme.backgroundChatTextInput || "#fff",
      color: theme.text,
      pointerEvents: "auto",
      marginBottom: 16,
      fontSize: 16,
      shadowColor: theme.primary || "#007AFF",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      transition: "all 0.3s ease",
    },
    textInputError: {
      borderColor: theme.danger || "red",
      color: theme.danger || "red",
      borderWidth: 2,
      shadowColor: theme.danger || "red",
      shadowOpacity: 0.2,
    },
    isPublicText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
      letterSpacing: 0.3,
    },
    handleInputError: {
      borderColor: theme.danger || "red",
      borderWidth: 2,
      shadowColor: theme.danger || "red",
      shadowOpacity: 0.2,
    },
    handleTextError: {
      color: theme.danger || "red",
      marginTop: 8,
      marginBottom: 16,
      fontSize: 14,
      fontWeight: "500",
    },
    buttonDisabled: {
      backgroundColor: theme.textSecondary || "#999",
      opacity: 0.6,
      transform: [{ scale: 0.98 }],
    },
    inputWrapperContainer: {
      position: "relative",
      width: "100%",
      marginBottom: 8,
    },
    overlayIndicator: {
      position: "absolute",
      right: 18,
      top: "50%",
      marginTop: -10,
    },
  });
}

export default CreateGroupModal;
