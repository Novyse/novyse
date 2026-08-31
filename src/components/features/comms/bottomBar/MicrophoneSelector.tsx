import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import {
  useMediaDeviceOptions,
  MICROPHONE_DEVICE_OPTIONS,
} from "@/src/components/features/comms/bottomBar/useMediaDeviceOptions";

interface MicrophoneSelectorProps {
  visible: boolean;
  onClose: () => void;
  onMicrophoneSelected: (deviceId: string) => void;
  currentDeviceId: string;
}

const MicrophoneSelector = ({
  visible,
  onClose,
  onMicrophoneSelected,
  currentDeviceId,
}: MicrophoneSelectorProps) => {
  const { options, loading } = useMediaDeviceOptions({
    enabled: visible,
    currentDeviceId,
    ...MICROPHONE_DEVICE_OPTIONS,
  });

  return (
    <SettingsSelectModal
      visible={visible}
      onClose={onClose}
      options={options}
      value={currentDeviceId}
      onChange={onMicrophoneSelected}
      titleKey="chat.comms.selectors.microphone.title"
      loading={loading}
      loadingKey="chat.comms.selectors.microphone.loading"
    />
  );
};

export default MicrophoneSelector;
