import React, { useState, useContext, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

import Button from "@/src/components/ui/button/Button";
import CustomTextInput from "@/src/components/ui/input/TextInput";
import ToggleSelector from "@/src/components/ui/switch/SegmentedSwitch";

import { ThemeContext } from "@/src/context/ThemeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import AdaptiveModal from "../../../modalSheets/AdaptiveModal";
import SelectButton from "./ChatTypeButton";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import Icon from "@/src/components/ui/icon/Icon";
import AppText from "@/src/components/ui/text/AppText";

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

  const styles = createStyle(theme);

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

  const privacyOptions = useMemo(
    () => [
      {
        value: "PRIVATE",
        label: t("modals.create_chat.privacy.private"),
        icon: "SquareLock02Icon",
      },
      {
        value: "PUBLIC",
        label: t("modals.create_chat.privacy.public"),
        icon: "Globe02Icon",
      },
    ],
    [t],
  );

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
    <View>
      {/* Header */}
      <View style={styles.header}>
        <AppText
          style={styles.modalSubtitle}
          translationKey="modals.create_chat.subtitle"
        />
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
        <CustomTextInput
          placeholder={t("modals.create_chat.fields.namePlaceholder")}
          value={name}
          onChange={handleNameChange}
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
          />
          <SelectButton
            id="FORUM"
            icon="Comment01Icon"
            titleKey="modals.create_chat.types.forum"
            subtitleKey="modals.create_chat.types.forumDesc"
            selected={type}
            onSelect={setType}
            theme={theme}
          />
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <AppText
          style={styles.sectionLabel}
          translationKey="modals.create_chat.sections.privacy"
        />
        <ToggleSelector
          options={privacyOptions}
          value={privacy}
          onChange={handlePrivacyChange}
        />
      </View>

      {/* Chat Handle */}
      {privacy === "PUBLIC" && (
        <View style={styles.section}>
          <AppText
            style={styles.inputLabel}
            translationKey="modals.create_chat.fields.handle"
          />
          <CustomTextInput
            prefix="@"
            placeholder={t("modals.create_chat.fields.handlePlaceholder")}
            value={handle}
            onChange={handleHandleChange}
            autoCapitalize="none"
            suffix={
              isHandleLoading ? (
                <ActivityIndicator size="small" color={theme.icon} />
              ) : handleAvailability === true ? (
                <Icon name="Tick02Icon" size={20} color={theme.successText} />
              ) : handleAvailability === false ? (
                <Icon
                  name="MultiplicationSignIcon"
                  size={20}
                  color={theme.dangerText}
                />
              ) : null
            }
          />
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
      <View style={styles.footer}>
        <Button
          translationKey="modals.create_chat.actions.create"
          icon="PlusSignIcon"
          onPress={handleCreateChat}
        />
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
      titleTranslationKey="modals.create_chat.title"
    >
      {ModalContent}
    </AdaptiveModal>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
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
    helperText: {
      fontSize: 12,
      color: theme.placeholderText,
      marginTop: 6,
    },
    // Cards Styles
    cardsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    },
    // Footer
    footer: {
      paddingTop: 16,
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundCard,
    },
  });
}

export default CreateChatModal;
