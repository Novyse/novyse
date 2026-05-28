import React, { useState, useContext, useMemo } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

import HoverAndPressedButton from "../../HoverAndPressedButton";

import { ThemeContext } from "@/src/context/ThemeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import AdaptiveModal from "../AdaptiveModal";
import SelectButton from "./Button";
import StatusMessage from "../../StatusMessage";
import Icon from "@/src/components/Icon";
import AppText from "@/src/components/AppText";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import { validate } from "@/src/utils/welcome/validator";

const CreateChatModal = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  const { width } = useWindowDimensions();
  const isNarrow = width <= 360;
  const styles = createStyle(theme, isNarrow);

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

  const snapPoints = useMemo(() => ["85%"], []);

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
    setHandle(value.toLowerCase());
    console.log("Validating handle:", validate.handle(value));
    if (validate.handle(value)) {
      setIsHandleLoading(true);
      setHandleError(null);
      setHandleAvailable(null);

      // Clear any existing timer
      if (handleTimer) clearTimeout(handleTimer);

      // Set new timer to check availability after typing stops
      const timer = setTimeout(async () => {
        const { success, available } = await gateway.check.handle(value);
        if (success) {
          setHandleAvailable(available);
          if (!available)
            setHandleError(t("modals.create_chat.errors.handleTaken"));
          else setHandleError(null);
          setIsHandleLoading(false);
        } else {
          setHandleAvailable(false);
          setHandleError(t("modals.create_chat.errors.handleError"));
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
          validate.requirements.handle +
            " " +
            t("modals.create_chat.fields.publicRequired"),
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
        validate.requirements.handle +
          " " +
          t("modals.create_chat.fields.publicRequired"),
      );
      return;
    }

    if (!validate.chat.name(name)) {
      setNameError(validate.chat.requirements.name);
      return;
    }
    if (privacy === "PUBLIC" && !validate.handle(handle)) {
      setHandleError(
        validate.requirements.handle +
          " " +
          t("modals.create_chat.fields.publicRequired"),
      );
      return;
    }

    if (
      privacy === "PUBLIC" &&
      (handleAvailability === false || handleAvailability === undefined)
    ) {
      setHandleError(t("modals.create_chat.errors.handleTaken"));
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
      await eventEmitter.chat.new(chat, []);
      // Navigate to the newly created chat
      setSelectedChatUUID(chat.uuid);
    } else {
      console.error("Error during chat creation");
    }
  };

  const ModalContent = (
    <View style={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText
            style={styles.modalTitle}
            translationKey="modals.create_chat.title"
          />
          <AppText
            style={styles.modalSubtitle}
            translationKey="modals.create_chat.subtitle"
          />
        </View>
      </View>

      {/* Chat Identity */}
      <View style={styles.section}>
        <AppText
          style={styles.sectionLabel}
          translationKey="modals.create_chat.sections.identity"
        />
        <AppText
          style={styles.inputLabel}
          translationKey="modals.create_chat.fields.name"
        />
        <TextInput
          style={styles.input}
          placeholder={t("modals.create_chat.fields.namePlaceholder")}
          placeholderTextColor={theme.placeholderText}
          value={name}
          onChangeText={handleNameChange}
        />
        <AppText
          style={styles.helperText}
          translationKey="modals.create_chat.fields.nameHelper"
        />
      </View>

      {/* Communication Style */}
      <View style={styles.section}>
        <AppText
          style={styles.sectionLabel}
          translationKey="modals.create_chat.sections.commsStyle"
        />
        <View style={styles.cardsRow}>
          <SelectButton
            id="GROUP"
            icon="UserGroupIcon"
            titleKey="modals.create_chat.types.group"
            subtitleKey="modals.create_chat.types.groupDesc"
            selected={type}
            onSelect={setType}
            theme={theme}
          />
          <SelectButton
            id="CHANNEL"
            icon="Megaphone03Icon"
            titleKey="modals.create_chat.types.channel"
            subtitleKey="modals.create_chat.types.channelDesc"
            selected={type}
            onSelect={setType}
            theme={theme}
            disabled={true}
          />
          <SelectButton
            id="FORUM"
            icon="Comment01Icon"
            titleKey="modals.create_chat.types.forum"
            subtitleKey="modals.create_chat.types.forumDesc"
            selected={type}
            onSelect={setType}
            theme={theme}
            disabled={true}
          />
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <AppText
          style={styles.sectionLabel}
          translationKey="modals.create_chat.sections.privacy"
        />
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
              color={privacy === "PRIVATE" ? theme.text : theme.subtitle}
            />
            <AppText
              style={[
                styles.toggleText,
                privacy === "PRIVATE" && styles.textWhite,
              ]}
              translationKey="modals.create_chat.privacy.private"
            />
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
              color={privacy === "PUBLIC" ? theme.text : theme.subtitle}
            />
            <AppText
              style={[
                styles.toggleText,
                privacy === "PUBLIC" && styles.textWhite,
              ]}
              translationKey="modals.create_chat.privacy.public"
            />
          </HoverAndPressedButton>
        </View>
      </View>

      {/* Chat Handle */}
      {privacy === "PUBLIC" && (
        <View style={styles.section}>
          <AppText
            style={styles.inputLabel}
            translationKey="modals.create_chat.fields.handle"
          />
          <View style={styles.inputWrapper}>
            <AppText style={styles.prefix} text="@" />
            <TextInput
              style={styles.inputWithPrefix}
              placeholder={t("modals.create_chat.fields.handlePlaceholder")}
              placeholderTextColor={theme.placeholderText}
              value={handle}
              onChangeText={handleHandleChange}
              autoCapitalize="none"
            />
            {isHandleLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.icon}
                style={styles.loader}
              />
            ) : handleAvailability === true ? (
              <Icon name="Tick02Icon" size={20} color={theme.successText} />
            ) : handleAvailability === false ? (
              <Icon
                name="MultiplicationSignIcon"
                size={20}
                color={theme.dangerText}
              />
            ) : null}
          </View>
          <AppText
            style={styles.helperText}
            translationKey="modals.create_chat.fields.handleHelper"
          />
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
          onPress={onClose}
          style={[styles.cancelBtn, isNarrow && styles.cancelBtnNarrow]}
        >
          <AppText
            style={styles.cancelBtnText}
            translationKey="modals.create_chat.actions.cancel"
          />
        </HoverAndPressedButton>
        <HoverAndPressedButton
          style={[styles.createBtn, isNarrow && styles.createBtnNarrow]}
          onPress={handleCreateChat}
        >
          <Icon name="PlusSignIcon" size={18} color={theme.text} />
          <AppText
            style={styles.createBtnText}
            translationKey="modals.create_chat.actions.create"
          />
        </HoverAndPressedButton>
      </View>
    </View>
  );

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      snapPoints={snapPoints}
      hideCloseX={true}
    >
      {ModalContent}
    </AdaptiveModal>
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
      color: theme.icon,
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
      color: theme.icon,
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
