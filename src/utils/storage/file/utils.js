const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "00:00";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "--:--";
  return formatTime(seconds);
};

const formatFileSize = (size) => {
  if (!size) return "0 B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) + " " + ["B", "KB", "MB", "GB"][i]
  );
};

export { formatTime, formatDuration, formatFileSize };
