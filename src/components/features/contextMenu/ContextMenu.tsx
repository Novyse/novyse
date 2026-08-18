import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";

import BlurredView from "@/src/components/layout/BlurredView";

export interface ContainerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  position?: ContextMenuPosition;
  containerBounds?: ContainerBounds;
  width?: number;
  estimatedHeight?: number;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_BOUNDS: ContainerBounds = { x: 0, y: 0, width: 0, height: 0 };
const EDGE_PADDING = 10;

export function getContextMenuPosition({
  position,
  containerBounds = DEFAULT_BOUNDS,
  width,
  estimatedHeight,
}: {
  position?: ContextMenuPosition;
  containerBounds?: ContainerBounds;
  width: number;
  estimatedHeight?: number;
}) {
  const boundsWidth = containerBounds.width || 0;
  const boundsHeight = containerBounds.height || 0;

  let x = (position?.x || 0) - (containerBounds.x || 0);
  let y = (position?.y || 0) - (containerBounds.y || 0);

  if (boundsWidth > 0 && x + width > boundsWidth) {
    x = boundsWidth - width - EDGE_PADDING;
  }
  if (x < EDGE_PADDING) {
    x = EDGE_PADDING;
  }

  if (
    estimatedHeight &&
    boundsHeight > 0 &&
    y + estimatedHeight > boundsHeight
  ) {
    y = y - estimatedHeight;
    if (y < EDGE_PADDING) {
      y = EDGE_PADDING;
    }
  }

  return { x, y };
}

const ContextMenu = ({
  visible,
  onClose,
  children,
  header,
  footer,
  position,
  containerBounds,
  width = 220,
  estimatedHeight,
  style,
}: ContextMenuProps) => {
  const overlayRef = useRef<View>(null);
  const [measuredBounds, setMeasuredBounds] =
    useState<ContainerBounds>(DEFAULT_BOUNDS);

  const updateBounds = useCallback(() => {
    overlayRef.current?.measureInWindow(
      (x, y, measuredWidth, measuredHeight) => {
        if (measuredWidth > 0 && measuredHeight > 0) {
          setMeasuredBounds({
            x,
            y,
            width: measuredWidth,
            height: measuredHeight,
          });
        }
      },
    );
  }, []);

  const resolvedBounds =
    containerBounds && containerBounds.width > 0
      ? containerBounds
      : measuredBounds;

  const menuPosition = useMemo(
    () =>
      getContextMenuPosition({
        position,
        containerBounds: resolvedBounds,
        width,
        estimatedHeight,
      }),
    [position, resolvedBounds, width, estimatedHeight],
  );

  if (!visible) {
    return null;
  }

  return (
    <View ref={overlayRef} style={styles.overlay} onLayout={updateBounds}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        // @ts-expect-error web right-click dismiss
        onContextMenu={(e: Event) => {
          e.preventDefault();
          onClose();
        }}
      />
      <View
        style={[
          styles.wrapper,
          { width },
          position ? { top: menuPosition.y, left: menuPosition.x } : null,
          style,
        ]}
      >
        {header}
        <BlurredView style={styles.menuContainer}>{children}</BlurredView>
        {footer}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  wrapper: {
    position: "absolute",
    zIndex: 1001,
  },
  menuContainer: {
    borderRadius: 25,
    padding: 10,
    overflow: "hidden",
  },
});

export default ContextMenu;