import { useContext, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import Button from "@/src/components/ui/button/Button";
import TextInput from "@/src/components/ui/input/TextInput";
import Typography from "@/src/components/ui/typography/Typography";
import LinkText from "@/src/components/ui/typography/Typography";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import StatusMessage from "@/src/components/features/status/StatusMessage";

import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";

import authBackend from "@/src/utils/backend-services/auth";
import auth from "@/src/utils/welcome/auth";

const DeleteAccount = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const router = useRouter();
  const styles = createStyles(theme);

  const myUUID = useUserStore((state) => state.localUserUUID);
  const username = useUserStore((state) => state.users[myUUID]?.handle);

  const [inputUsername, setInputUsername] = useState("");
  const [error, setError] = useState(null);

  const isMatch = inputUsername === username;

  const handleClose = () => {
    setInputUsername("");
    setError(null);
    onClose?.();
  };

  const handleConfirm = async () => {
    if (!isMatch) return;

    const response = await authBackend.account.delete();
    if (response) {
      await auth.logout();
      router.navigate("/welcome?deleteAccount=true");
    } else {
      setError(t("modals.create_chat.errors.genericError"));
    }
  };

  const ModalContent = (
    <View style={styles.container}>
      <Typography
        variant="subtitle"
        translationKey="modals.delete_account.warning"
      />

      <View>
        <TextInput
          value={inputUsername}
          onChange={setInputUsername}
          autoCapitalize="none"
          labelTranslationKey="modals.delete_account.confirm_instruction"
          translationOptions={{ username }}
        />
        <Typography>
          <Typography translationKey="modals.delete_account.helper_text" />{" "}
          <LinkText
            translationKey="modals.delete_account.learn_more"
            href="https://www.novyse.com/help/guides/account/delete"
          />
        </Typography>
      </View>

      <StatusMessage
        visible={!!error}
        onClose={() => setError(null)}
        content={[error]}
        type="error"
        theme={theme}
      />

      <View style={styles.footer}>
        <Button
          translationKey="modals.delete_account.delete"
          icon="Delete02Icon"
          disabled={!isMatch}
          onPress={handleConfirm}
          variant="danger"
        />
      </View>
    </View>
  );

  return (
    <AdaptiveModal
      visible={visible}
      onClose={handleClose}
      theme={theme}
      mode="adaptive"
      titleTranslationKey="modals.delete_account.title"
      titleStyle={styles.modalTitle}
    >
      {ModalContent}
    </AdaptiveModal>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      gap: 25,
    },
    modalTitle: {
      color: theme.dangerText,
    },
  });

export default DeleteAccount;
