import React from "react";
import Icon from "@/src/components/Icon";

import queueManager from "@/src/utils/chat/queueManager";

const DownloadButton = ({ uuid }) => {
  const handleDownload = async () => {
    await queueManager.addInboundFileJob(uuid);
  };

  return <Icon name="DownloadCircle01Icon" onPress={handleDownload} />;
};

export default DownloadButton;
