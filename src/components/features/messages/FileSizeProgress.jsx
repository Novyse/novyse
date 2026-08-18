import Typography from "@/src/components/ui/typography/Typography";
import useFileProgress from "@/src/hooks/file/useFileProgress";
import { formatFileSize } from "@/src/utils/storage/file/utils";

const FileSizeProgress = ({ uuid, size }) => {
  const progress = useFileProgress(uuid);

  let displayedSize = formatFileSize(size);
  if (progress && progress.loaded < progress.total) {
    displayedSize = `${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total)}`;
  }

  return <Typography size="xs" variant="subtitle" text={displayedSize} />;
};

export default FileSizeProgress;
