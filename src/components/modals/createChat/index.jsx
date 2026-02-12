import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import HoverAndPressedButton from "../../HoverAndPressedButton";

import { useRouter } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";

import ModalBase from "../ModalBase";
import SelectButton from "./Button";
import StatusMessage from "../../StatusMessage";
import Icon from "@/src/components/Icon";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import { validate } from "@/src/utils/welcome/validator";

const CreateChatModal = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const { width } = useWindowDimensions();
  const isNarrow = width <= 360;
  const styles = createStyle(theme, isNarrow);

  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState("GROUP"); // 'GROUP', 'CHANNEL', 'FORUM'
  const [privacy, setPrivacy] = useState("PRIVATE"); // 'PRIVATE', 'PUBLIC'
  const [handle, setHandle] = useState("");
  const [handleAvailability, setHandleAvailable] = useState(null); // null, true, false

  // Loading
  const [isHandleLoading, setIsHandleLoading] = useState(false);

  // Timer
  const [handleTimer, setHandleTimer] = useState(null);

  // Error States
  const [handleError, setHandleError] = useState(null);
  const [nameError, setNameError] = useState(null);

  const resetFields = () => {
    setName("");
    setType("GROUP");
    setPrivacy("PRIVATE");
    setHandle("");
    setHandleAvailable(null);
    setHandleError(null);
    setNameError(null);
  };

  const handleNameChange = (value) => {
    setName(value);
    if (validate.chat.name(value)) {
      setNameError(null);
    } else {
      setNameError(validate.chat.requirements.name);
    }
  };

  const handleHandleChange = (value) => {
    setHandle(value);
    console.log("Validating handle:", validate.handle(value));
    if (validate.handle(value)) {
      setIsHandleLoading(true);
      setHandleError(null);
      setHandleAvailable(null);

      // Clear any existing timer
      if (handleTimer) clearTimeout(handleTimer);

      // Set new timer to check availability after typing stops
      const timer = setTimeout(async () => {
        const { success, free } = await gateway.check.handle(value);
        if (success) {
          setHandleAvailable(free);
          if (!free) setHandleError("Handle already in use");
          else setHandleError(null);
          setIsHandleLoading(false);
        } else {
          setHandleAvailable(false);
          setHandleError("Error checking handle availability");
          setIsHandleLoading(false);
        }
      }, 1000);

      setHandleTimer(timer);
    } else {
      // Reset availability if handle is invalid
      setHandleAvailable(null);
      setHandleError(null);
      setIsHandleLoading(false);
      if (handleTimer) clearTimeout(handleTimer);
      if (value.length > 0) {
        setHandleError(
          validate.requirements.handle + " (Required for public chats)",
        );
      }
    }
  };

  const handlePrivacyChange = (value) => {
    setPrivacy(value);
    if (value === "PRIVATE") {
      setHandle("");
      setHandleAvailable(null);
      setHandleError(null);
    }
  };

  const handleCreateChat = async () => {
    if (
      !validate.chat.name(name) &&
      !validate.handle(handle) &&
      privacy === "PUBLIC"
    ) {
      setNameError(validate.chat.requirements.name);
      setHandleError(
        validate.requirements.handle + " (Required for public chats)",
      );
      return;
    }

    if (!validate.chat.name(name)) {
      setNameError(validate.chat.requirements.name);
      return;
    }
    if (privacy === "PUBLIC" && !validate.handle(handle)) {
      setHandleError(
        validate.requirements.handle + " (Required for public chats)",
      );
      return;
    }

    if (
      privacy === "PUBLIC" &&
      (handleAvailability === false || handleAvailability === undefined)
    ) {
      setHandleError("Handle already in use");
      return;
    }

    if (privacy === "PRIVATE") {
      setHandle("");
    }

    // @SamueleOrazioDurante da capire se inserire una sezione per aggiungere membri ancor prima della creazione
    const { success, chat } = await gateway.chat.create(type, [], name, handle);

    if (success) {
      console.info("Chat created successfully", chat);

      resetFields();
      onClose();

      // Notify other parts of the app about the new chat
      await eventEmitter.newChat(chat);
      // Clear the parameter after handling
      router.navigate(`/chat/${chat.uuid}`);
    } else {
      console.error("Error during chat creation");
    }
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      theme={theme}
      hideCloseX={true}
    >
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.modalTitle}>Create New Chat</Text>
            <Text style={styles.modalSubtitle}>
              Configure your new chat space settings below.
            </Text>
          </View>
        </View>

        {/* Chat Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CHAT IDENTITY</Text>
          <Text style={styles.inputLabel}>Chat Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Novyse News"
            placeholderTextColor="#8F90A6"
            value={name}
            onChangeText={handleNameChange}
          />
          <Text style={styles.helperText}>
            This is the name that will be visible to your members.
          </Text>
        </View>

        {/* Communication Style */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMMUNICATION STYLE</Text>
          <View style={styles.cardsRow}>
            <SelectButton
              id="GROUP"
              icon="UserGroupIcon"
              title="Group"
              subtitle="Best for small teams & friends."
              selected={type}
              onSelect={setType}
              theme={theme}
            />
            <SelectButton
              id="CHANNEL"
              icon="Megaphone03Icon"
              title="Channel"
              subtitle="Broadcast to unlimited audiences."
              selected={type}
              onSelect={setType}
              theme={theme}
              disabled={true}
            />
            <SelectButton
              id="FORUM"
              icon="Comment01Icon"
              title="Forum"
              subtitle="Organized discussions by topic."
              selected={type}
              onSelect={setType}
              theme={theme}
              disabled={true}
            />
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRIVACY SETTINGS</Text>
          <View style={styles.toggleContainer}>
            <HoverAndPressedButton
              style={[
                styles.toggleBtn,
                privacy === "PRIVATE" && styles.toggleBtnActive,
              ]}
              onPress={() => handlePrivacyChange("PRIVATE")}
            >
              <Icon
                name="SquareLock02Icon"
                size={16}
                color={privacy === "PRIVATE" ? "#FFF" : "#8F90A6"}
              />
              <Text
                style={[
                  styles.toggleText,
                  privacy === "PRIVATE" && styles.textWhite,
                ]}
              >
                Private
              </Text>
            </HoverAndPressedButton>

            <HoverAndPressedButton
              style={[
                styles.toggleBtn,
                privacy === "PUBLIC" && styles.toggleBtnActive,
              ]}
              onPress={() => handlePrivacyChange("PUBLIC")}
            >
              <Icon
                name="Globe02Icon"
                size={16}
                color={privacy === "PUBLIC" ? "#FFF" : "#8F90A6"}
              />
              <Text
                style={[
                  styles.toggleText,
                  privacy === "PUBLIC" && styles.textWhite,
                ]}
              >
                Public
              </Text>
            </HoverAndPressedButton>
          </View>
        </View>

        {/* Chat Handle */}
        {privacy === "PUBLIC" && (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Chat Handle</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>@</Text>
              <TextInput
                style={styles.inputWithPrefix}
                placeholder="your-handle"
                placeholderTextColor="#8F90A6"
                value={handle}
                onChangeText={handleHandleChange}
              />
              {isHandleLoading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.icon}
                  style={styles.loader}
                />
              ) : handleAvailability === true ? (
                <Icon name="Tick02Icon" size={20} color="#27AE60" />
              ) : handleAvailability === false ? (
                <Icon name="MultiplicationSignIcon" size={20} color="#E74C3C" />
              ) : null}
            </View>
            <Text style={styles.helperText}>
              People can find your chat using this handle.
            </Text>
          </View>
        )}

        {/* Error Messages */}
        <StatusMessage
          type="error"
          visible={!!(nameError || handleError)}
          content={[nameError, handleError].filter(Boolean)}
          onClose={() => {
            nameError && setNameError(null);
            handleError && setHandleError(null);
          }}
          theme={theme}
        />

        {/* Footer */}
        <View style={[styles.footer, isNarrow && styles.footerNarrow]}>
          <HoverAndPressedButton
            onPress={() => onClose()}
            style={[styles.cancelBtn, isNarrow && styles.cancelBtnNarrow]}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </HoverAndPressedButton>
          <HoverAndPressedButton
            style={[styles.createBtn, isNarrow && styles.createBtnNarrow]}
            onPress={handleCreateChat}
          >
            <Icon name="PlusSignIcon" size={18} color="#FFF" />
            <Text style={styles.createBtnText}>Create Chat</Text>
          </HoverAndPressedButton>
        </View>
      </View>
    </ModalBase>
  );
};

function createStyle(theme, isNarrow = false) {
  return StyleSheet.create({
    contentContainer: {
      padding: 20,
    },
    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 6,
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.placeholderText,
      lineHeight: 20,
    },
    // Sections
    section: {
      marginTop: 24,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.iconSecondary,
      letterSpacing: 1,
      marginBottom: 12,
      textTransform: "uppercase",
    },
    inputLabel: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.backgroundCard,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      outlineStyle: "none",
    },
    helperText: {
      fontSize: 12,
      color: theme.placeholderText,
      marginTop: 6,
    },
    // Privacy Toggle
    toggleContainer: {
      flexDirection: "row",
      backgroundColor: theme.backgroundCard,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.borderModal,
    },
    toggleBtn: {
      flex: 1,
      flexDirection: "row",
      paddingVertical: 10,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
    },
    toggleBtnActive: {
      backgroundColor: theme.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.placeholderText,
      marginLeft: 6,
    },
    textWhite: {
      color: theme.text,
      marginLeft: 6,
    },
    // Cards Styles
    cardsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    },
    // Handle Input with Prefix
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    prefix: {
      fontSize: 16,
      color: theme.placeholderText,
      fontWeight: "600",
      marginRight: 4,
    },
    inputWithPrefix: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      outlineStyle: "none",
    },
    // Footer
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      padding: 16,
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundCard,
    },
    footerNarrow: {
      flexDirection: "column-reverse",
      alignItems: "stretch",
      padding: 12,
    },
    cancelBtn: {
      marginRight: 16,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    cancelBtnNarrow: {
      marginRight: 0,
      marginTop: 8,
      width: "100%",
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    cancelBtnText: {
      color: theme.iconSecondary,
      fontSize: 15,
      fontWeight: "500",
      textAlign: isNarrow ? "center" : "left",
    },
    createBtn: {
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    createBtnNarrow: {
      width: "100%",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    createBtnText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
      marginLeft: 4,
      textAlign: "center",
    },
  });
}

export default CreateChatModal;
