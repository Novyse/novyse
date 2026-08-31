import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import {
  useMediaDeviceOptions,
  SPEAKER_DEVICE_OPTIONS,
} from "@/src/components/features/comms/bottomBar/useMediaDeviceOptions";

interface SpeakerSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSpeakerSelected: (deviceId: string) => void;
  currentDeviceId: string;
}

const SpeakerSelector = ({
  visible,
  onClose,
  onSpeakerSelected,
  currentDeviceId,
}: SpeakerSelectorProps) => {
  const { options, loading } = useMediaDeviceOptions({
    enabled: visible,
    currentDeviceId,
    ...SPEAKER_DEVICE_OPTIONS,
  });

  return (
    <SettingsSelectModal
      visible={visible}
      onClose={onClose}
      options={options}
      value={currentDeviceId}
      onChange={onSpeakerSelected}
      titleKey="chat.comms.selectors.speaker.title"
      loading={loading}
      loadingKey="chat.comms.selectors.speaker.loading"
    />
  );
};

export default SpeakerSelector;
