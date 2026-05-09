import React, {useContext} from "react";
import { View, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";
import { useCommsContext } from "@/context/CommsContext";
import { ThemeContext } from "@/context/ThemeContext";

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
  };

  const handleSlidingComplete = (val) => {
    const finalDbValue = Math.round(val - 30);
    setRemoteVolume(volKey, finalDbValue, !isScreenShare);
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderHeaderLeft}>
          <Icon name="VolumeHighIcon" size={16} color={theme.text} />
          <AppText style={styles.sliderLabel} text="Volume" />
        </View>
        <AppText
          style={styles.dbText}
          text={localDb > 0 ? `+${localDb} dB` : `${localDb} dB`}
        />
      </View>
      <Slider
        key={volKey}
        style={styles.slider}
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

const createStyles = (theme) => StyleSheet.create({
  sliderContainer: {
    padding: 12,
    marginTop: 4,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sliderHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sliderLabel: {
    fontSize: 13,
    marginLeft: 6,
    opacity: 0.8,
    color: theme.text, // Fallback color, will be overridden by theme if needed
  },
  dbText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.6,
    color: theme.text,
  },
  slider: {
    width: "100%",
    height: 35,
  },
});

export default VolumeControl;
