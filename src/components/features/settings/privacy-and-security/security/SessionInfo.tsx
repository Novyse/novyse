import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";

interface SessionInfoProps {
  ip: string;
  createdAt: string;
  lastActive: string;
}

const SessionInfo = ({ ip, createdAt, lastActive }: SessionInfoProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Typography>
        <Typography translationKey="settings.privacyAndSecurity.sessions.ip" />:{" "}
        {ip}
      </Typography>
      <Typography>
        <Typography translationKey="settings.privacyAndSecurity.sessions.created" />
        : {createdAt}
      </Typography>
      <Typography>
        <Typography translationKey="settings.privacyAndSecurity.sessions.lastActivity" />
        : {lastActive}
      </Typography>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginTop: 4,
      gap: 2,
    },
  });

export default SessionInfo;
