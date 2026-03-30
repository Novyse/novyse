import React from "react";
import Icon from "@/src/components/Icon";

type MediaType = "VOICE" | "AUDIO" | "VIDEO" | "IMAGE";

interface DefaultButtonProps {
  type: MediaType | string;
  isPlaying?: boolean;
  handleDefaultPress: () => void;
}

const DefaultButton = ({
  type,
  isPlaying,
  handleDefaultPress,
}: DefaultButtonProps) => {
  const renderButtonIcon = (): React.ReactElement => {
    switch (type) {
      case "VOICE":
      case "AUDIO": {
        const iconName = isPlaying ? "PauseIcon" : "PlayIcon";
        return <Icon name={iconName} size={33} onPress={handleDefaultPress} />;
      }
      case "VIDEO":
        return <Icon name="PlayIcon" size={33} onPress={handleDefaultPress} />;
      case "IMAGE":
        return <></>;
      default:
        return (
          <Icon name="DocumentAttachmentIcon" size={33} onPress={handleDefaultPress} />
        );
    }
  };

  return renderButtonIcon();
};

export default DefaultButton;