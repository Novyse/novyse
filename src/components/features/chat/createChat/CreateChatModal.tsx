import { useState, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";

import Button from "@/src/components/ui/button/Button";
import TextInput from "@/src/components/ui/input/TextInput";
import SegmentedSwitch, {
  type ToggleOption,
} from "@/src/components/ui/switch/SegmentedSwitch";

import { useThemeContext, type Theme } from "@/src/context/ThemeContext";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";

import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import SelectButton from "./ChatTypeButton";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import Icon from "@/src/components/ui/icon/Icon";
import Typography from "@/src/components/ui/typography/Typography";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import { validate } from "@/src/utils/welcome/validator";

type ChatType = "GROUP" | "CHANNEL" | "FORUM";
type PrivacyType = "PRIVATE" | "PUBLIC";

interface CreateChatModalProps {
  visible: boolean;
  onClose: () => void;
}

interface CreatedChat {
  uuid: string;
}

const CreateChatModal = ({ visible, onClose }: CreateChatModalProps) => {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );

  const styles = createStyle();

  const [name, setName] = useState("");
  const [type, setType] = useState<ChatType>("GROUP");
  const [privacy, setPrivacy] = useState<PrivacyType>("PRIVATE");
  const [handle, setHandle] = useState("");
  const [handleAvailability, setHandleAvailable] = useState<boolean | null>(
    null,
  );

  const [isHandleLoading, setIsHandleLoading] = useState(false);
  const handleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [handleError, setHandleError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const snapPoints = useMemo(() => ["85%"], []);

  const privacyOptions = useMemo<ToggleOption<PrivacyType>[]>(
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

  const handleNameChange = (value: string) => {
    setName(value);
    const validation = validate.chat.name(value);
    setNameError(validation.success ? null : (validation.error ?? null));
  };

  const handleHandleChange = (value: string) => {
    const normalizedValue = value.toLowerCase();
    setHandle(normalizedValue);

    if (handleTimer.current) clearTimeout(handleTimer.current);

    if (!normalizedValue) {
      setHandleAvailable(null);
      setHandleError(null);
      setIsHandleLoading(false);
      return;
    }

    const validation = validate.handle(normalizedValue);
    if (!validation.success) {
      setHandleAvailable(null);
      setHandleError(
        `${validation.error} ${t("modals.create_chat.fields.publicRequired")}`,
      );
      setIsHandleLoading(false);
      return;
    }

    setIsHandleLoading(true);
    setHandleError(null);
    setHandleAvailable(null);

    handleTimer.current = setTimeout(async () => {
      try {
        const { success, available } = await gateway.check.handle(
          normalizedValue,
        );

        if (success) {
          setHandleAvailable(available ?? false);
          setHandleError(
            available
              ? null
              : t("modals.create_chat.errors.handleTaken"),
          );
        } else {
          setHandleAvailable(false);
          setHandleError(t("modals.create_chat.errors.handleError"));
        }
      } catch {
        setHandleAvailable(false);
        setHandleError(t("modals.create_chat.errors.handleError"));
      } finally {
        setIsHandleLoading(false);
      }
    }, 1000);
  };

  const handlePrivacyChange = (value: PrivacyType) => {
    setPrivacy(value);
    if (value === "PRIVATE") {
      setHandle("");
      setHandleAvailable(null);
      setHandleError(null);
    }
  };

  const handleCreateChat = async () => {
    const nameValidation = validate.chat.name(name);
    const handleValidation = validate.handle(handle);

    if (!nameValidation.success) {
      setNameError(nameValidation.error ?? null);
    }

    if (privacy === "PUBLIC" && !handleValidation.success) {
      setHandleError(
        `${handleValidation.error} ${t("modals.create_chat.fields.publicRequired")}`,
      );
    }

    if (!nameValidation.success) {
      return;
    }

    if (privacy === "PUBLIC" && !handleValidation.success) {
      return;
    }

    if (
      privacy === "PUBLIC" &&
      (handleAvailability === false || handleAvailability === null)
    ) {
      setHandleError(t("modals.create_chat.errors.handleTaken"));
      return;
    }

    const chatHandle = privacy === "PRIVATE" ? "" : handle;

    const { success, chat } = (await gateway.chat.create(
      type,
      [],
      name,
      chatHandle,
    )) as { success: boolean; chat?: CreatedChat };

    if (success && chat?.uuid) {
      resetFields();
      onClose();

      await eventEmitter.chat.new(chat, []);
      setSelectedChatUUID(chat.uuid);
    } else {
      console.error("Error during chat creation");
    }
  };

  const ModalContent = (
    <View style={styles.container}>
        <Typography
          variant="subtitle"
          translationKey="modals.create_chat.subtitle"
        />

      <View>
        <TextInput
          labelTranslationKey="modals.create_chat.fields.name"
          placeholder={t("modals.create_chat.fields.namePlaceholder")}
          value={name}
          onChange={handleNameChange}
        />
      </View>

      <View>
        <Typography
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

      <View>
        <SegmentedSwitch
          labelTranslationKey="modals.create_chat.sections.privacy"
          options={privacyOptions}
          value={privacy}
          onChange={handlePrivacyChange}
        />
      </View>

      {privacy === "PUBLIC" && (
        <View>
          <TextInput
            labelTranslationKey="modals.create_chat.fields.handle"
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
          <Typography
            translationKey="modals.create_chat.fields.handleHelper"
          />
        </View>
      )}

      <StatusMessage
        type="error"
        visible={!!(nameError || handleError)}
        content={[nameError, handleError].filter(
          (message): message is string => Boolean(message),
        )}
        onClose={() => {
          if (nameError) setNameError(null);
          if (handleError) setHandleError(null);
        }}
      />


        <Button
          translationKey="modals.create_chat.actions.create"
          onPress={handleCreateChat}
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
      titleTranslationKey="modals.create_chat.title"
    >
      {ModalContent}
    </AdaptiveModal>
  );
};

function createStyle() {
  return StyleSheet.create({
    container: {
      gap: 25,
    },
    cardsRow: {
      flexDirection: "row",
      gap: 15,
    },
  });
}

export default CreateChatModal;
