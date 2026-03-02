import React from "react";
import Icon from "@/src/components/Icon";

const DefaultButton = ({ type, isPlaying, handleDefaultPress }) => {
  const renderButtonIcon = () => {
    switch (type) {
      case "VOICE":
      case "AUDIO":
        const iconName = isPlaying ? "PauseIcon" : "PlayIcon";
        return <Icon name={iconName} size={33} onPress={handleDefaultPress} />;
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
