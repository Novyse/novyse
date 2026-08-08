import React from "react";
import Typography from "@/src/components/ui/typography/Typography";
import useFileProgress from "@/src/hooks/file/useFileProgress";
import { formatFileSize } from "@/src/utils/storage/file/utils";

const FileSizeProgress = ({ uuid, size, style }) => {
  const progress = useFileProgress(uuid);

  let displayedSize = formatFileSize(size);
  if (progress && progress.loaded < progress.total) {
    displayedSize = `${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total)}`;
  }

  return <Typography style={style} text={displayedSize} />;
};

export default FileSizeProgress;
