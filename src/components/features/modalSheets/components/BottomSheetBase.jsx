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
      hideCloseX = false,
      title,
      titleTranslationKey,
      titleTranslationOptions,
      titleStyle,
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

    const renderBackground = useCallback(
      ({ style }) => (
        <BlurredView
          style={[
            style,
            {
              borderTopLeftRadius: 25,
              borderTopRightRadius: 25,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            },
          ]}
          isBorderActive={false}
        />
      ),
      [],
    );

    const Container = scrollable ? BottomSheetScrollView : BottomSheetView;
    const insets = useSafeAreaInsets();
    const contentPadding = {
      padding: 10,
      paddingBottom: insets.bottom + 10,
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        enableOverDrag={enableOverDrag}
        enableDynamicSizing={enableDynamicSizing}
        backdropComponent={renderBackdrop}
        backgroundComponent={renderBackground}
        backgroundStyle={{ backgroundColor: "transparent" }}
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
            titleStyle={titleStyle}
            hideCloseX={hideCloseX}
            onClose={onClose}
            theme={theme}
          />
          {children}
        </Container>
      </BottomSheetModal>
    );
  },
);

export default BottomSheetBase;
