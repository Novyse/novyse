import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import AppText from "@/src/components/ui/text/AppText";
import Button from "@/src/components/ui/button/Button";
import Banner from "@/src/components/Banner";
import ProfileHeader from "@/src/components/profile/ProfileHeader";
import FormSection from "@/src/components/features/settings/account/modify-profile/modifyProfileForm/ModifyProfileForm";
import StatusMessage from "@/src/components/StatusMessage";
import BlurredView from "@/src/components/BlurredView";

import { useThemeContext } from "@/src/context/ThemeContext";
import { useScreen } from "@/src/context/ScreenContext";
import useUserStore from "@/src/context/UserContext";

import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

interface ModifyProfilePanelProps {
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

export default function ModifyProfilePanel({
  name,
  surname,
  username,
  biography = "",
  birthday,
  country,
  region = "",
  profilePictureUUID,
  onEditAvatar,
}: ModifyProfilePanelProps) {
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
          <BlurredView style={styles.glassPanel}>
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
          </BlurredView>
        </ScrollView>
      </View>
      {!message && !error && hasChanges && (
        <BlurredView style={styles.floatingBar}>
          <AppText
            style={styles.floatingText}
            translationKey="settings.modifyProfile.unsavedChanges"
          />
          <View style={styles.floatingButtons}>
            <Button
              translationKey="settings.modifyProfile.restore"
              onPress={handleRestore}
              disabled={isSaving}
            />
            <Button
              translationKey={
                isSaving
                  ? "settings.modifyProfile.saving"
                  : "settings.modifyProfile.save"
              }
              onPress={handleSave}
              disabled={isSaving}
            />
          </View>
        </BlurredView>
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
      borderRadius: 25,
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
      borderRadius: 25,
      paddingVertical: 15,
      paddingHorizontal: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: isSmallScreen ? "90%" : 500,
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
    floatingMessageWrapper: {
      position: "absolute",
      bottom: isSmallScreen ? 20 : 40,
      alignSelf: "center",
      width: isSmallScreen ? "90%" : 500,
      zIndex: 100,
      pointerEvents: "none",
    },
  });
