import React, { forwardRef, useCallback } from "react";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

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
      ...props
    },
    ref,
  ) => {
    const renderBackdrop = useCallback(
      (props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      [],
    );

    const Container = scrollable ? BottomSheetScrollView : BottomSheetView;

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
          backgroundColor: theme.backgroundModal,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.iconSecondary,
          width: 40,
        }}
        onDismiss={onClose}
        {...props}
      >
        <Container style={{ flex: 1 }}>{children}</Container>
      </BottomSheetModal>
    );
  },
);

export default BottomSheetBase;
