import React from "react";
import Icon from "@/src/components/Icon";

const DefaultButton = ({ type, isPlaying, handleDefaultPress }) => {
  const renderButtonIcon = () => {
    switch (type) {
      case "VOICE":
      case "AUDIO":
        const iconName = isPlaying ? "PauseIcon" : "PlayIcon";
        return <Icon name={iconName} onPress={handleDefaultPress} />;
      case "VIDEO":
        return <Icon name="PlayIcon" onPress={handleDefaultPress} />;
      case "IMAGE":
        return <></>;
      default:
        return (
          <Icon name="DocumentAttachmentIcon" onPress={handleDefaultPress} />
        );
    }
  };

  return renderButtonIcon();
};

export default DefaultButton;
