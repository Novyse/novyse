import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";

import BlurredView from "@/src/components/layout/BlurredView";

import SectionHeader from "@/src/components/features/settings/account/modify-profile/modifyProfileForm/SectionHeader";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";

interface ConnectionCardProps {
  platform: string;
  icon: string;
  title?: string;
  subtitle?: string;
  translationKeyTitle?: string;
  translationKeySubtitle?: string;
  connected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

function ConnectionCard({
  platform,
  icon,
  title,
  subtitle,
  translationKeyTitle,
  translationKeySubtitle,
  connected,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  return (
    <View style={styles.connectionCard}>
      <View style={styles.connectionInfo}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: connected
                ? theme.backgroundMain
                : theme.backgroundCard,
            },
          ]}
        >
          <Icon
            name={icon}
            size={20}
            color={connected ? theme.primary : theme.icon}
          />
        </View>
        <View>
          <Typography
            translationKey={translationKeyTitle}
            text={title}
          />
          <Typography
            translationKey={translationKeySubtitle}
            text={subtitle}
          />
        </View>
      </View>
      <HoverAndPressedButton
        style={connected ? styles.disconnectBtn : styles.connectBtn}
        onPress={connected ? onDisconnect : onConnect}
      >
        <Typography
          variant={connected ? "danger" : "default"}
          translationKey={
            connected
              ? "settings.modifyProfile.unlink"
              : "settings.modifyProfile.link"
          }
        />
      </HoverAndPressedButton>
    </View>
  );
}

export default function Connections() {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <>
      <SectionHeader
        icon="Link04Icon"
        translationKey="settings.modifyProfile.connections"
      />
      <View style={styles.overlayWrapper}>
        <View style={styles.row}>
          <ConnectionCard
            platform="twitter"
            icon="NewTwitterIcon"
            translationKeyTitle="settings.modifyProfile.twitter"
            subtitle="@novyse_official"
            connected={true}
            onDisconnect={() => {}}
          />

          <ConnectionCard
            platform="github"
            icon="GithubIcon"
            translationKeyTitle="settings.modifyProfile.github"
            translationKeySubtitle="settings.modifyProfile.shareRepo"
            connected={false}
            onConnect={() => {}}
          />
        </View>
        <BlurredView style={styles.infoContainer}>
          <Icon name="UnavailableIcon" />
        </BlurredView>
      </View>
    </>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlayWrapper: {
      position: "relative",
    },
    infoContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.backgroundModalOverlay,
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      borderRadius: 8,
    },
    row: {
      flexDirection: "column",
      pointerEvents: "none",
      gap: 12,
    },
    connectionCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.backgroundCard,
      padding: 16,
      borderRadius: 20,
      marginBottom: 12,
    },
    connectionInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    disconnectBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: theme.backgroundDanger,
    },
    connectBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: theme.primary,
    },
  });
