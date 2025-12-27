import { useEffect, useState } from "react";

const useImageDimension = (uri) => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!uri) return;

    const img = new window.Image();
    img.onload = () => {
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
    };
    img.onerror = () => {
      console.error("Failed to load blob image");
    };

    img.src = uri;
  }, [uri]);

  return { width, height };
};

export default useImageDimension;
