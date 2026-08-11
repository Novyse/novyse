import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import {
  useMediaDeviceOptions,
  CAMERA_DEVICE_OPTIONS,
} from "@/src/components/features/comms/bottomBar/useMediaDeviceOptions";

interface CameraSelectorProps {
  visible: boolean;
  onClose: () => void;
  onCameraSelected: (deviceId: string) => void;
  currentDeviceId: string;
}

const CameraSelector = ({
  visible,
  onClose,
  onCameraSelected,
  currentDeviceId,
}: CameraSelectorProps) => {
  const { options, loading } = useMediaDeviceOptions({
    enabled: visible,
    currentDeviceId,
    ...CAMERA_DEVICE_OPTIONS,
  });

  return (
    <SettingsSelectModal
      visible={visible}
      onClose={onClose}
      options={options}
      value={currentDeviceId}
      onChange={onCameraSelected}
      titleKey="chat.comms.selectors.camera.title"
      loading={loading}
      loadingKey="chat.comms.selectors.camera.loading"
    />
  );
};

export default CameraSelector;
