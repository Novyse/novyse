import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function useResizerStorage(
  key,
  defaultWidth,
  minWidthOverride,
  maxWidthOverride,
) {
  const [width, setWidth] = useState(defaultWidth);
  const [isReady, setIsReady] = useState(false);

  // Load saved width on mount
  useEffect(() => {
    const loadWidth = async () => {
      try {
        const saved = await AsyncStorage.getItem(key);
        if (saved !== null) {
          let parsedWidth = parseFloat(saved);

          // Constrain loaded width to current screen boundaries just in case screen size changed
          if (minWidthOverride !== undefined) {
            parsedWidth = Math.max(minWidthOverride, parsedWidth);
          }
          if (maxWidthOverride !== undefined) {
            parsedWidth = Math.min(maxWidthOverride, parsedWidth);
          }

          setWidth(parsedWidth);
        }
      } catch (err) {
        console.error(`Failed to load resizer width for ${key}`, err);
      } finally {
        setIsReady(true);
      }
    };

    loadWidth();
  }, [key]); // Intentionally omitting min/max overrides from deps to only run on mount and key change

  // Expose an updater function that also syncs to storage
  const setPersistedWidth = async (newWidthOrUpdater) => {
    setWidth((prev) => {
      const value =
        typeof newWidthOrUpdater === "function"
          ? newWidthOrUpdater(prev)
          : newWidthOrUpdater;

      // Async storage save (fire and forget)
      AsyncStorage.setItem(key, value.toString()).catch((err) =>
        console.error(`Failed to save resizer width for ${key}`, err),
      );

      return value;
    });
  };

  return [width, setPersistedWidth, isReady];
}
