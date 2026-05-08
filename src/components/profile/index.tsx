import React, { useContext, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Banner from "@/src/components/Banner";
import ProfileHeader from "./ProfileHeader";
import AboutMe from "./AboutMe";
import Connections from "./Connections";
import BirthdayLocation from "./BirthdayLocation";
import QRCodeModal from "./QRCodeModal";

import { ThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";
import SmartBackground from "../SmartBackground";
import Icon from "@/src/components/Icon";

interface Connection {
  name: string;
  icon: string;
  url?: string;
}

interface ProfileProps {
  uuid: string;
  name: string;
  surname: string;
  username: string;
  birthday?: string;
  country?: string;
  profilePictureUUID?: string;
  bannerUUID?: string;
  isOnline?: boolean;
  biography?: string;
  connections?: Connection[];
  onConnectionPress?: (connection: Connection) => void;
  onEditAvatar?: () => void;
}

export default function Profile({
  uuid,
  name,
  surname,
  username,
  birthday,
  country,
  profilePictureUUID,
  bannerUUID,
  isOnline,
  biography,
  connections,
  onConnectionPress,
  onEditAvatar,
}: ProfileProps) {
  const { theme } = useContext(ThemeContext);
  const { width, height } = useWindowDimensions();
  const { isSmallScreen } = useScreen();
  const insets = useSafeAreaInsets();

  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  const styles = createStyles(theme, isSmallScreen, height, insets);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Glass Card Container */}
        <SmartBackground
          // colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.15)"]}

          style={styles.glassPanel}
        >
          <View style={{ position: "relative" }}>
            <Banner theme={theme} />

            <Icon
              name="QrCodeIcon"
              onPress={() => setIsQrModalVisible(true)}
              style={styles.qrIconContainer}
            />
          </View>

          <ProfileHeader
            uuid={uuid}
            name={name}
            surname={surname}
            username={username}
            profilePictureUUID={profilePictureUUID}
            isOnline={isOnline}
            onEditAvatar={onEditAvatar}
          />

          {/* About Me Section */}
          <AboutMe biography={biography} />

          {/* Birthday and Location Section */}
          {birthday ||
            (country && (
              <BirthdayLocation birthday={birthday} country={country} />
            ))}

          {/* Connections Section */}
          {connections && (
            <Connections
              connections={connections}
              onConnectionPress={onConnectionPress}
            />
          )}
        </SmartBackground>
      </ScrollView>

      {/* QR Code Modal */}
      <QRCodeModal
        visible={isQrModalVisible}
        onClose={() => setIsQrModalVisible(false)}
        username={username}
        profilePictureUUID={profilePictureUUID}
        theme={theme}
      />
    </View>
  );
}

const createStyles = (
  theme: any,
  isSmallScreen: boolean,
  screenHeight: number,
  insets: { top: number; bottom: number; left: number; right: number },
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flex: 1,
    },
    glassPanel: {
      overflow: "hidden",
      flex: 1,
    },
    qrIconContainer: {
      position: "absolute",
      top: 10 + insets.top,
      left: 10,
      zIndex: 10,
    },
  });
