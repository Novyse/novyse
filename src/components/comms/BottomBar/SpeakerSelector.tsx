import { useState, useEffect } from "react";
import { Room } from "livekit-client";
import SettingsSelectModal from "@/src/components/features/settings/SettingsSelectModal";
import { SelectOption } from "@/src/components/features/settings/SettingsSelectGroup";

interface SpeakerSelectorProps {
  visible: boolean;
  onClose: () => void;
  onMicrophoneSelected: (deviceId: string) => void;
  currentDeviceId: string;
}

const SpeakerSelector = ({
  visible,
  onClose,
  onMicrophoneSelected,
  currentDeviceId,
}: SpeakerSelectorProps) => {
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMicrophones();
    }
  }, [visible]);

  const loadMicrophones = async () => {
    setLoading(true);
    try {
      const microphones = await Room.getLocalDevices("audioinput");
      setAvailableMicrophones(microphones);
    } catch (error) {
      console.error("Error loading microphones:", error);
    } finally {
      setLoading(false);
    }
  };

  const microphoneOptions: SelectOption[] = availableMicrophones.map(
    (device) => {
      const isSelected =
        device.deviceId === currentDeviceId ||
        (currentDeviceId === "default" &&
          device.deviceId === availableMicrophones[0]?.deviceId);

      return {
        value: device.deviceId,
        iconName: "Mic02Icon",
        labelKey: !device.label
          ? "chat.comms.selectors.microphone.defaultName"
          : undefined,
        labelOptions: !device.label ? { id: device.deviceId } : undefined,
        labelText: device.label || undefined,
        valueKey: isSelected
          ? "chat.comms.selectors.microphone.currentlySelected"
          : undefined,
      };
    },
  );

  return (
    <SettingsSelectModal
      visible={visible}
      onClose={onClose}
      options={microphoneOptions}
      value={currentDeviceId}
      onChange={onMicrophoneSelected}
      titleKey="chat.comms.selectors.microphone.title"
      loading={loading}
      loadingKey="chat.comms.selectors.microphone.loading"
    />
  );
};

export default SpeakerSelector;
