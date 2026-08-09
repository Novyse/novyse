import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import { useCommsContext } from "@/src/context/CommsContext";
import { ThemeContext } from "@/src/context/ThemeContext";

const VolumeControl = ({ volKey, isScreenShare }) => {
  const { remoteVolumes, setRemoteVolume } = useCommsContext();
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const initialDb = Number(remoteVolumes[volKey] ?? 0);
  const [localDb, setLocalDb] = React.useState(initialDb);

  React.useEffect(() => {
    setLocalDb(initialDb);
  }, [initialDb]);

  const handleValueChange = (val) => {
    const newDbValue = Math.round(val - 30);
    setLocalDb(newDbValue);
    setRemoteVolume(volKey, newDbValue, false);
  };

  const handleSlidingComplete = (val) => {
    const finalDbValue = Math.round(val - 30);
    setRemoteVolume(volKey, finalDbValue, !isScreenShare);
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderHeaderLeft}>
          <Icon name="VolumeHighIcon" size={20} />
          <Typography size="sm" text="Volume" />
        </View>
        <Typography
          size="xs"
          text={localDb > 0 ? `+${localDb} dB` : `${localDb} dB`}
        />
      </View>
      <Slider
        key={volKey}
        minimumValue={0}
        maximumValue={60}
        step={1}
        value={localDb + 30}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.secondary}
        thumbTintColor={theme.primary}
        tapToSeek
      />
    </View>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    sliderContainer: {
      padding: 10,
    },
    sliderHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    sliderHeaderLeft: {
      flexDirection: "row",
      gap: 10,
    },
  });

export default VolumeControl;
