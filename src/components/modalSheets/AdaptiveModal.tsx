import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Platform } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";

import ModalBase from "./ModalBase";
import BottomSheetBase from "./BottomSheetBase";
import type { Theme } from "@/src/context/ThemeContext";

export type AdaptiveModalMode = "modal" | "bottomsheet" | "adaptive";

export interface AdaptiveModalRef {
  present: () => void;
  dismiss: () => void;
}

export interface AdaptiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  theme: Theme;
  mode?: AdaptiveModalMode;
  snapPoints?: (string | number)[];
  scrollable?: boolean;
  fullscreen?: boolean;
  hideCloseX?: boolean;
  hideOverlay?: boolean;
  popover?: boolean;
  enablePanDownToClose?: boolean;
  enableOverDrag?: boolean;
  enableDynamicSizing?: boolean;
}

const AdaptiveModal = forwardRef<AdaptiveModalRef, AdaptiveModalProps>(
  (
    {
      visible,
      onClose,
      children,
      theme,
      mode = "adaptive",
      snapPoints = ["50%"],
      scrollable = true,
      fullscreen = false,
      hideCloseX = false,
      hideOverlay = false,
      popover = false,
      enablePanDownToClose = true,
      enableOverDrag = false,
      enableDynamicSizing = false,
    },
    ref,
  ) => {
    const useBottomSheetPresentation =
      mode === "bottomsheet" ||
      (mode === "adaptive" && Platform.OS === "android");

    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useEffect(() => {
      if (!useBottomSheetPresentation) {
        return;
      }

      if (visible) {
        bottomSheetRef.current?.present();
      } else {
        bottomSheetRef.current?.dismiss();
      }
    }, [visible, useBottomSheetPresentation]);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          if (useBottomSheetPresentation) {
            bottomSheetRef.current?.present();
          }
        },
        dismiss: () => {
          if (useBottomSheetPresentation) {
            bottomSheetRef.current?.dismiss();
          }
        },
      }),
      [useBottomSheetPresentation],
    );

    if (useBottomSheetPresentation) {
      return (
        <BottomSheetBase
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          onClose={onClose}
          theme={theme}
          scrollable={scrollable}
          hideOverlay={hideOverlay}
          enablePanDownToClose={enablePanDownToClose}
          enableOverDrag={enableOverDrag}
          enableDynamicSizing={enableDynamicSizing}
        >
          {children}
        </BottomSheetBase>
      );
    }

    return (
      <ModalBase
        visible={visible}
        onClose={onClose}
        theme={theme}
        scrollable={scrollable}
        fullscreen={fullscreen}
        hideCloseX={hideCloseX}
        hideOverlay={hideOverlay}
        popover={popover}
      >
        {children}
      </ModalBase>
    );
  },
);

AdaptiveModal.displayName = "AdaptiveModal";

export default AdaptiveModal;
