import { useState, useEffect } from "react";
import { Room } from "livekit-client";
import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import { SelectOption } from "@/src/components/features/settings/SettingsSelectGroup";

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
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCameras();
    }
  }, [visible]);

  const loadCameras = async () => {
    setLoading(true);
    try {
      const cameras = await Room.getLocalDevices("videoinput");
      setAvailableCameras(cameras);
    } catch (error) {
      console.error("Error loading cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  const cameraOptions: SelectOption[] = availableCameras.map((device) => {
    const isSelected =
      device.deviceId === currentDeviceId ||
      (currentDeviceId === "default" &&
        device.deviceId === availableCameras[0]?.deviceId);

    return {
      value: device.deviceId,
      iconName: "Camera01Icon",
      labelKey: !device.label ? "chat.comms.selectors.camera.defaultName" : undefined,
      labelOptions: !device.label ? { id: device.deviceId } : undefined,
      labelText: device.label || undefined,
      valueKey: isSelected
        ? "chat.comms.selectors.camera.currentlySelected"
        : undefined,
    };
  });

  return (
    <SettingsSelectModal
      visible={visible}
      onClose={onClose}
      options={cameraOptions}
      value={currentDeviceId}
      onChange={onCameraSelected}
      titleKey="chat.comms.selectors.camera.title"
      loading={loading}
      loadingKey="chat.comms.selectors.camera.loading"
    />
  );
};

export default CameraSelector;
