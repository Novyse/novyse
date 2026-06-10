import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import AppText from "@/src/components/AppText";
import Banner from "@/src/components/Banner";
import ProfileHeader from "@/src/components/profile/ProfileHeader";
import FormSection from "@/src/components/settings/account/modify-profile/Page/FormSection";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import StatusMessage from "@/src/components/StatusMessage";

import { useThemeContext } from "@/src/context/ThemeContext";
import { useScreen } from "@/src/context/ScreenContext";
import useUserStore from "@/src/context/UserContext";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

interface ModifyProfileProps {
  name: string;
  surname: string;
  username: string;
  email?: string;
  biography?: string;
  birthday: string;
  country: string;
  region?: string;
  profilePictureUUID?: string;
  onEditAvatar?: () => void;
}

export default function ModifyProfile({
  name,
  surname,
  username,
  biography = "",
  birthday,
  country,
  region = "",
  profilePictureUUID,
  onEditAvatar,
}: ModifyProfileProps) {
  const { theme } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const { isSmallScreen } = useScreen();

  const { localUserUUID, getUser } = useUserStore();
  const userUUID = localUserUUID as string;
  const user = localUserUUID ? getUser(localUserUUID) : null;

  const [baseValues, setBaseValues] = React.useState({
    name,
    surname,
    username,
    biography: biography ?? "",
    birthday: birthday ?? "",
    country: country ?? "",
    region: region ?? "",
  });

  const [formValues, setFormValues] = React.useState(baseValues);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  React.useEffect(() => {
    const original = {
      name,
      surname,
      username,
      biography: biography ?? "",
      birthday: birthday ?? "",
      country: country ?? "",
      region: region ?? "",
    };
    setBaseValues(original);
    setFormValues(original);
  }, [name, surname, username, biography, birthday, country, region]);

  const hasChanges = Object.keys(baseValues).some(
    (key) =>
      formValues[key as keyof typeof formValues] !==
      baseValues[key as keyof typeof baseValues],
  );

  const handleChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleRestore = () => {
    setFormValues(baseValues);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const { name, surname, username, biography, birthday, country, region } =
        formValues;

      const response = await gateway.user.profile.update.all(
        name,
        surname,
        biography,
      );

      if ((response as any).success) {
        await eventEmitter.user.profile.update({
          ...formValues,
          userUUID: userUUID as string,
        });
        setBaseValues(formValues);
        setMessage("settings.modifyProfile.success");
      } else {
        setError("settings.modifyProfile.error");
      }
    } catch (e: any) {
      console.error("Error saving profile", e);
      setError("settings.modifyProfile.saveError");
    } finally {
      setIsSaving(false);
    }
  };

  const styles = createStyles(theme, isSmallScreen, height);
  return (
    <>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Glass Card Container */}
          <LinearGradient
            colors={theme.backgroundMainGradient as [string, string]}
            style={styles.glassPanel}
          >
            <Banner
              theme={theme}
              height={isSmallScreen ? 120 : 180}
              onEdit={() => {}}
            />
            <ProfileHeader
              uuid={userUUID}
              name={name}
              surname={surname}
              profilePictureUUID={profilePictureUUID}
              username={username}
              onEditAvatar={onEditAvatar}
            />

            <FormSection
              values={formValues}
              onChangeField={handleChange}
              isSmallScreen={isSmallScreen}
            />

            {/* Spacer for bottom footer */}
            <View style={{ height: hasChanges ? 80 : 20 }} />
          </LinearGradient>
        </ScrollView>
      </View>
      {!message && !error && hasChanges && (
        <View style={styles.floatingBar}>
          <AppText
            style={styles.floatingText}
            translationKey="settings.modifyProfile.unsavedChanges"
          />
          <View style={styles.floatingButtons}>
            <HoverAndPressedButton
              style={styles.restoreBtn}
              onPress={handleRestore}
            >
              <AppText
                style={styles.restoreText}
                translationKey="settings.modifyProfile.restore"
              />
            </HoverAndPressedButton>
            <HoverAndPressedButton style={styles.saveBtn} onPress={handleSave}>
              <AppText
                style={styles.saveText}
                translationKey={
                  isSaving
                    ? "settings.modifyProfile.saving"
                    : "settings.modifyProfile.save"
                }
              />
            </HoverAndPressedButton>
          </View>
        </View>
      )}
      <View style={styles.floatingMessageWrapper}>
        <StatusMessage
          type="success"
          visible={!!message}
          translationKey={message}
          timeout={5000}
          onClose={() => setMessage("")}
        />
        <StatusMessage
          type="error"
          visible={!!error}
          translationKey={error}
          timeout={5000}
          onClose={() => setError("")}
        />
      </View>
    </>
  );
}

const createStyles = (
  theme: any,
  isSmallScreen: boolean,
  screenHeight: number,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: isSmallScreen ? 0 : 16,
      alignItems: "center",
      paddingTop: isSmallScreen ? 120 : 80,
      paddingBottom: isSmallScreen ? 10 : 20,
    },
    glassPanel: {
      borderRadius: 24,
      overflow: "hidden",
      width: isSmallScreen ? "100%" : "90%",
      maxWidth: 600,
      minHeight: isSmallScreen ? screenHeight * 0.8 : 800,
    },
    floatingBar: {
      position: "absolute",
      bottom: isSmallScreen ? 20 : 40,
      alignSelf: "center",
      backgroundColor: theme.backgroundModalOverlay,
      borderRadius: 24,
      paddingVertical: 12,
      paddingHorizontal: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: isSmallScreen ? "90%" : 500,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    floatingText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
    },
    floatingButtons: {
      flexDirection: "row",
      gap: 12,
    },
    restoreBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.backgroundTextField,
    },
    restoreText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    saveBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.primary,
    },
    saveText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
    },
    floatingMessageWrapper: {
      position: "absolute",
      bottom: isSmallScreen ? 20 : 40,
      alignSelf: "center",
      width: isSmallScreen ? "90%" : 500,
      zIndex: 100,
      pointerEvents: "none",
    },
  });
