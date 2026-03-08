import { useRef, useMemo } from "react";
import { PanResponder, useWindowDimensions } from "react-native";

interface PanelResizerProps {
  currentWidth: number;
  setWidth: (width: number) => void;
  minWidth?: number;
  maxWidthPadding?: number;
  reverse?: boolean;
}

export const usePanelResizer = ({
  currentWidth,
  setWidth,
  minWidth = 350,
  maxWidthPadding = 350,
  reverse = true,
}: PanelResizerProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const widthRef = useRef(currentWidth);
  const startWidthRef = useRef(currentWidth);

  // Keep ref in sync for closure safety in PanResponder
  widthRef.current = currentWidth;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startWidthRef.current = widthRef.current;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (evt, gestureState) => {
          // If reverse is true, dragging left (negative dx) increases width
          const delta = reverse ? -gestureState.dx : gestureState.dx;
          const newWidth = Math.max(
            minWidth,
            Math.min(
              windowWidth - maxWidthPadding,
              startWidthRef.current + delta,
            ),
          );
          setWidth(newWidth);
        },
      }),
    [windowWidth, minWidth, maxWidthPadding, reverse, setWidth],
  );

  return panResponder.panHandlers;
};
