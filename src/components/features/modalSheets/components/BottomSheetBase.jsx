import React, { forwardRef, useCallback } from "react";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BlurredView from "@/src/components/layout/BlurredView";
import ModalHeader from "./ModalHeader";

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
      title,
      titleTranslationKey,
      titleTranslationOptions,
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
          opacity={hideOverlay ? 0 : 0.5}
          pressBehavior="close"
        />
      ),
      [hideOverlay],
    );

    const insets = useSafeAreaInsets();
    const sheetGap = insets.bottom;
    const bottomInset = insets.bottom;

    const renderBackground = useCallback(
      ({ style }) => (
        <BlurredView
          style={[
            style,
            {
              borderRadius: 25,
            },
          ]}
          isBorderActive={false}
        />
      ),
      [],
    );

    const Container = scrollable ? BottomSheetScrollView : BottomSheetView;
    const contentPadding = {
      padding: 25,
      paddingBottom: 25,
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        enableOverDrag={enableOverDrag}
        enableDynamicSizing={enableDynamicSizing}
        detached
        bottomInset={bottomInset}
        style={{ marginHorizontal: sheetGap }}
        backdropComponent={renderBackdrop}
        backgroundComponent={renderBackground}
        backgroundStyle={{
          backgroundColor: "transparent",
          borderRadius: 25,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.icon,
          width: 40,
        }}
        onDismiss={onClose}
        {...props}
      >
        <Container
          style={scrollable ? { flex: 1 } : contentPadding}
          contentContainerStyle={scrollable ? contentPadding : undefined}
        >
          <ModalHeader
            title={title}
            titleTranslationKey={titleTranslationKey}
            titleTranslationOptions={titleTranslationOptions}
            hideCloseX={true}
            onClose={onClose}
          />
          {children}
        </Container>
      </BottomSheetModal>
    );
  },
);

export default BottomSheetBase;
