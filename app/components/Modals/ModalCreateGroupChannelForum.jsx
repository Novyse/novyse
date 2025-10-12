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
import gateway from "../../utils/backend-services/api-gateway";
import { useRouter } from "expo-router";
import eventEmitter from "../../utils/global/Events/EventEmitter";
import StatusMessage from "../StatusMessage";
import InputDeviceDropdown from "../settings/vocal-chat/InputDeviceDropdown";
import ModalBase from "./ModalBase";

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

      // Notify other parts of the app about the new chat
      await eventEmitter.newChat(chat);
      // Clear the parameter after handling
      router.navigate(`/chat/${chat.uuid}`);

      // Aggiorno lista chat @SamueleOrazioDurante
    } else {
      console.error("Error during chat creation");
    }
  };

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.modalView}>
        <View style={styles.titleContainer}>
          <Text style={styles.modalTitleText}>Create a new chat</Text>
        </View>

        <StatusMessage type="error" text={error} />

        <TextInput
          style={[styles.textInput, error && styles.textInputError]}
          placeholder={getNamePlaceholder()}
          placeholderTextColor={theme.placeholderText}
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
                  isTextError2 ? theme.danger : theme.placeholderText
                }
                value={groupHandle}
                onChangeText={handleGroupHandleChange}
              />
              {isHandleLoading && (
                <ActivityIndicator
                  size="small"
                  color={theme.primary}
                  style={styles.overlayIndicator}
                />
              )}
            </View>
            {groupHandleAvailable === false && (
              <Text style={styles.handleTextError}>Handle already in use</Text>
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
            backgroundColor: theme.backgroundTextField,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: theme.borderColor,
          }}
        >
          <Text style={styles.isPublicText}>
            {isPublic ? "Public" : "Private"}
          </Text>
          <Switch
            trackColor={{
              false: theme.textSecondary,
              true: theme.primary,
            }}
            thumbColor={isPublic ? "#ffffff" : "#f4f3f4"}
            ios_backgroundColor={theme.textSecondary}
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
            gap: 15,
          }}
        >
          <Pressable
            style={[
              styles.button,
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
    </ModalBase>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    modalView: {
      padding: 20,
      minWidth: 400,
    },
    titleContainer: {
      alignItems: "center",
      marginBottom: 8,
      paddingBottom: 15,
      width: "100%",
    },
    button: {
      borderRadius: 15,
      paddingVertical: 15,
      paddingHorizontal: 24,
      backgroundColor: theme.primary,
      width: "100%",
    },
    textStyle: {
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      fontSize: 15,
    },
    modalTitleText: {
      marginBottom: 24,
      textAlign: "center",
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
    },
    textInput: {
      width: "100%",
      outlineStyle: "none",
      borderRadius: 15,
      paddingVertical: 15,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: theme.borderColor,
      backgroundColor: theme.backgroundTextField,
      color: theme.text,
      pointerEvents: "auto",
      marginBottom: 15,
      fontSize: 15,
    },
    textInputError: {
      borderColor: theme.danger,
      color: theme.danger,
      borderWidth: 2,
      shadowColor: theme.danger,
      shadowOpacity: 0.2,
    },
    isPublicText: {
      color: theme.text,
      fontSize: 15,
      paddingHorizontal: 12,
      
    },
    handleInputError: {
      borderColor: theme.danger,
      borderWidth: 2,
      shadowColor: theme.danger,
      shadowOpacity: 0.2,
    },
    handleTextError: {
      color: theme.danger,
      marginTop: 8,
      marginBottom: 15,
      fontSize: 14,
      fontWeight: "500",
    },
    buttonDisabled: {
      backgroundColor: theme.textSecondary,
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
