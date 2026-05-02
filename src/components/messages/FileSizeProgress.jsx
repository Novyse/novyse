import React from "react";
import AppText from "@/src/components/AppText";
import useFileProgress from "@/src/hooks/file/useFileProgress";
import { formatFileSize } from "@/src/utils/storage/file/utils";

const FileSizeProgress = ({ uuid, size, style }) => {
  const progress = useFileProgress(uuid);

  let displayedSize = formatFileSize(size);
  if (progress && progress.loaded < progress.total) {
    displayedSize = `${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total)}`;
  }

  return <AppText style={style} text={displayedSize} />;
};

export default FileSizeProgress;
