import React, { useState, useContext, useMemo } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import HoverAndPressedButton from "../../HoverAndPressedButton";
import { ThemeContext } from "@/src/context/ThemeContext";
import AdaptiveModal from "../AdaptiveModal";
import StatusMessage from "../../StatusMessage";
import Icon from "@/src/components/Icon";
import AppText from "@/src/components/AppText";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import ToggleSelector from "@/src/components/ToggleSelector";

const CreateSubModal = ({ visible, onClose, chatUUID }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const styles = createStyle(theme);

  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const snapPoints = useMemo(() => ["50%"], []);

  const [type, setType] = useState("MIXED");

  const handleCreate = async () => {
    if (!name || name.trim().length === 0) {
      setError(t("modals.create_chat.requirements.name") || "Name is required");
      return;
    }

    const { success, sub } = await gateway.chat.sub.create(
      chatUUID,
      name.trim(),
      type,
    );
    if (success) {
      setName("");
      setType("MIXED");
      setError(null);
      onClose();
      await eventEmitter.chat.update(chatUUID, "sub_create", null, { sub });
    } else {
      setError("Failed to create sub");
    }
  };

  const ModalContent = (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <AppText
          style={styles.modalSubtitle}
          text="Enter a name for the sub-channel"
        />
      </View>

      <View style={styles.section}>
        <AppText
          style={styles.inputLabel}
          translationKey="modals.create_chat.fields.name"
        />
        <TextInput
          style={styles.input}
          placeholder={t("modals.create_chat.fields.namePlaceholder")}
          placeholderTextColor={theme.placeholderText}
          value={name}
          onChangeText={(val) => {
            setName(val);
            setError(null);
          }}
        />
      </View>

      <View style={styles.section}>
        <AppText style={styles.inputLabel} text="Sub Type" />
        <View style={{ marginBottom: 12 }}>
          <ToggleSelector
            options={[
              { value: "MIXED", label: "Mixed" },
              { value: "TEXT", label: "Text" },
              { value: "VOCAL", label: "Vocal" },
              { value: "ANNOUNCE", label: "Announce" },
              { value: "BROADCAST", label: "Broadcast", disabled: true },
              { value: "BOARD", label: "Board", disabled: true },
            ]}
            value={type}
            onChange={(val) => setType(val)}
          />
        </View>
      </View>

      <StatusMessage
        type="error"
        visible={!!error}
        content={error}
        onClose={() => setError(null)}
        theme={theme}
      />

      <View style={styles.footer}>
        <HoverAndPressedButton onPress={onClose} style={styles.cancelBtn}>
          <AppText
            style={styles.cancelBtnText}
            translationKey="modals.create_chat.actions.cancel"
          />
        </HoverAndPressedButton>
        <HoverAndPressedButton style={styles.createBtn} onPress={handleCreate}>
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
      title="Create Sub"
    >
      {ModalContent}
    </AdaptiveModal>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    contentContainer: {
      padding: 20,
    },
    header: {
      marginBottom: 20,
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.placeholderText,
      lineHeight: 20,
    },
    section: {
      marginTop: 10,
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
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      padding: 16,
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundCard,
    },
    cancelBtn: {
      marginRight: 16,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    cancelBtnText: {
      color: theme.icon,
      fontSize: 15,
      fontWeight: "500",
    },
    createBtn: {
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    createBtnText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
      marginLeft: 4,
    },
  });
}

export default CreateSubModal;
