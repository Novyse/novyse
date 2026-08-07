import { useContext, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProfileBanner from "@/src/components/features/profile/ProfileBanner";
import ProfileHeader from "./ProfileHeader";
import AboutMe from "./ProfileAboutMe";
import Connections from "./ProfileConnections";
import BirthdayLocation from "./ProfileBirthdayLocation";
import QRCodeModal from "./ProfileQRCodeModal";

import { ThemeContext } from "@/src/context/ThemeContext";
import SmartBackground from "../../layout/SmartBackground";
import Icon from "@/src/components/ui/icon/Icon";

interface Connection {
  name: string;
  icon: string;
  url?: string;
}

interface ProfilePanelProps {
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

export default function ProfilePanel({
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
}: ProfilePanelProps) {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  const styles = createStyles(insets);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SmartBackground style={styles.glassPanel}>
          <View style={{ position: "relative" }}>
            <ProfileBanner />

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
          {(!!birthday || !!country) && (
            <BirthdayLocation birthday={birthday} country={country} />
          )}

          {/* Connections Section */}
          {connections && connections.length > 0 && (
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

const createStyles = (insets: {
  top: number;
  bottom: number;
  left: number;
  right: number;
}) =>
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
