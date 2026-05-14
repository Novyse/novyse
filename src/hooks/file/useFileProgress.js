import { useState, useEffect } from "react";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

const useFileProgress = (uuid) => {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!uuid) return;

    const handleProgress = (data) => {
      if (data.uuid === uuid) {
        setProgress({ loaded: data.loaded, total: data.total });
      }
    };

    const emitter = eventEmitter.getEmitter();
    emitter.on("message:progress", handleProgress);

    return () => {
      emitter.off("message:progress", handleProgress);
    };
  }, [uuid]);

  return progress;
};

export default useFileProgress;
