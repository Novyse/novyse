import React, {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useContext,
} from "react";
import { Platform } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";

import ModalBase from "./ModalBase";
import BottomSheetBase from "./BottomSheetBase";
import { ThemeContext } from "@/src/context/ThemeContext";

export type AdaptiveModalMode = "modal" | "bottomsheet" | "adaptive";

export interface AdaptiveModalRef {
  present: () => void;
  dismiss: () => void;
}

export interface AdaptiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  mode?: AdaptiveModalMode;
  snapPoints?: (string | number)[];
  scrollable?: boolean;
  fullscreen?: boolean;
  hideCloseX?: boolean;
  hideOverlay?: boolean;
  enablePanDownToClose?: boolean;
  enableOverDrag?: boolean;
  enableDynamicSizing?: boolean;
  title?: string;
  titleTranslationKey?: string;
  titleTranslationOptions?: Record<string, unknown>;
}

const AdaptiveModal = forwardRef<AdaptiveModalRef, AdaptiveModalProps>(
  (
    {
      visible,
      onClose,
      children,
      mode = "adaptive",
      snapPoints = ["50%"],
      scrollable = true,
      fullscreen = false,
      hideCloseX = false,
      hideOverlay = false,
      enablePanDownToClose = true,
      enableOverDrag = false,
      enableDynamicSizing = false,
      title,
      titleTranslationKey,
      titleTranslationOptions,
    },
    ref,
  ) => {
    const { theme } = useContext(ThemeContext);

    const useBottomSheetPresentation =
      mode === "bottomsheet" || (mode === "adaptive" && Platform.OS !== "web");

    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const isOpenRef = useRef(false);

    const handleSheetDismiss = useCallback(() => {
      isOpenRef.current = false;
      onClose();
    }, [onClose]);

    useEffect(() => {
      if (!useBottomSheetPresentation) return;

      if (visible && !isOpenRef.current) {
        const timer = setTimeout(() => {
          bottomSheetRef.current?.present();
          isOpenRef.current = true;
        }, 50);
        return () => clearTimeout(timer);
      }

      if (!visible && isOpenRef.current) {
        bottomSheetRef.current?.dismiss();
        isOpenRef.current = false;
      }
    }, [visible, useBottomSheetPresentation]);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          if (useBottomSheetPresentation && !isOpenRef.current) {
            bottomSheetRef.current?.present();
            isOpenRef.current = true;
          }
        },
        dismiss: () => {
          if (useBottomSheetPresentation && isOpenRef.current) {
            bottomSheetRef.current?.dismiss();
            isOpenRef.current = false;
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
          onClose={handleSheetDismiss}
          theme={theme}
          scrollable={scrollable}
          hideOverlay={hideOverlay}
          title={title}
          titleTranslationKey={titleTranslationKey}
          titleTranslationOptions={titleTranslationOptions}
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
        title={title}
        titleTranslationKey={titleTranslationKey}
        titleTranslationOptions={titleTranslationOptions}
      >
        {children}
      </ModalBase>
    );
  },
);

AdaptiveModal.displayName = "AdaptiveModal";

export default AdaptiveModal;
