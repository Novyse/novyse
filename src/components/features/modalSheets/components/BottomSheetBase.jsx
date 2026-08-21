import { forwardRef, useCallback } from "react";
import { useWindowDimensions } from "react-native";
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
      onClose,
      theme,
      scrollable = true,
      hideOverlay = false,
      enablePanDownToClose = true,
      enableContentPanningGesture = true,
      title,
      titleTranslationKey,
      titleTranslationOptions,
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const sheetGap = insets.bottom;

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
          style={[style, { borderRadius: 25 }]}
          isBorderActive={false}
        />
      ),
      [],
    );

    const contentPadding = { padding: 25, paddingBottom: 25 };

    const header = (
      <ModalHeader
        title={title}
        titleTranslationKey={titleTranslationKey}
        titleTranslationOptions={titleTranslationOptions}
        hideCloseX
        onClose={onClose}
      />
    );

    const body = scrollable ? (
      <BottomSheetScrollView
        contentContainerStyle={contentPadding}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {header}
        {children}
      </BottomSheetScrollView>
    ) : (
      <BottomSheetView style={contentPadding}>
        {header}
        {children}
      </BottomSheetView>
    );

    return (
      <BottomSheetModal
        ref={ref}
        enablePanDownToClose={enablePanDownToClose}
        enableContentPanningGesture={enableContentPanningGesture}
        maxDynamicContentSize={windowHeight * 0.85}
        detached
        bottomInset={sheetGap}
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
      >
        {body}
      </BottomSheetModal>
    );
  },
);

export default BottomSheetBase;
