import { useState, useContext, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import Button from "@/src/components/ui/button/Button";
import TextInput from "@/src/components/ui/input/TextInput";
import { ThemeContext } from "@/src/context/ThemeContext";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import Typography from "@/src/components/ui/typography/Typography";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import SegmentedSwitch from "@/src/components/ui/switch/SegmentedSwitch";

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
      setError(t("modals.create_chat.errors.nameRequired"));
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
      setError(t("modals.create_chat.errors.genericError"));
    }
  };

  const ModalContent = (
    <View style={styles.container}>
      <Typography
        variant="subtitle"
        text="Enter a name for the sub-channel"
      />

      <TextInput
        labelTranslationKey="modals.create_chat.fields.name"
        placeholder={t("modals.create_chat.fields.namePlaceholder")}
        value={name}
        onChange={(val) => {
          setName(val);
          setError(null);
        }}
      />

      <SegmentedSwitch
        label="Sub Type"
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

      <StatusMessage
        type="error"
        visible={!!error}
        content={error}
        onClose={() => setError(null)}
        theme={theme}
      />

      <Button
        translationKey="modals.create_chat.actions.create"
        icon="PlusSignIcon"
        onPress={handleCreate}
      />
    </View>
  );

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      snapPoints={snapPoints}
      title="Create Sub"
    >
      {ModalContent}
    </AdaptiveModal>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      gap: 25,
    },
  });
}

export default CreateSubModal;
