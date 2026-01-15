import React from "react";
import Icon from "@/src/components/Icon";

const DownloadButton = ({ uuid }) => {
  const handleDownload = () => {
    // Implement download logic here, possibly using the uuid
    console.log(`Downloading file with UUID: ${uuid}`);
  };

  return <Icon name="DownloadCircle01Icon" onPress={handleDownload} />;
};

export default DownloadButton;
