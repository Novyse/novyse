import React from "react";
import Icon from "@/src/components/ui/icon/Icon";

import queueManager from "@/src/utils/chat/queueManager";

interface DownloadButtonProps {
  uuid: string;
}

const DownloadButton = ({ uuid }: DownloadButtonProps) => {
  const handleDownload = async (): Promise<void> => {
    await queueManager.addInboundFileJob(uuid);
  };

  return <Icon name="ArrowDown03Icon" size={33} onPress={handleDownload} />;
};

export default DownloadButton;
