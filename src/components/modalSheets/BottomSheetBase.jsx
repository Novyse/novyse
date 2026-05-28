import React, { forwardRef, useCallback } from "react";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BottomSheetBase = forwardRef(
  (
    {
      children,
      snapPoints = ["50%"],
      onClose,
      theme,
      scrollable = true,
      enablePanDownToClose = true,
      enableOverDrag = false,
      enableDynamicSizing = false,
      hideOverlay = false,
      ...props
    },
    ref,
  ) => {
    const renderBackdrop = useCallback(
      (backdropProps) => (
        <BottomSheetBackdrop
          {...backdropProps}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={hideOverlay ? 0 : 1}
          pressBehavior="close"
        />
      ),
      [hideOverlay],
    );

    const Container = scrollable ? BottomSheetScrollView : BottomSheetView;

    const insets = useSafeAreaInsets();

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        enableOverDrag={enableOverDrag}
        enableDynamicSizing={enableDynamicSizing}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.backgroundMain,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.icon,
          width: 40,
        }}
        onDismiss={onClose}
        {...props}
      >
        <Container style={{ flex: 1, paddingBottom: insets.bottom }}>
          {children}
        </Container>
      </BottomSheetModal>
    );
  },
);

export default BottomSheetBase;
