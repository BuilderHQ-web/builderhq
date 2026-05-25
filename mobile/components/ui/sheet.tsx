/**
 * <Sheet /> — Uber/Airbnb-style bottom sheet.
 *
 * Thin wrapper over @gorhom/bottom-sheet's BottomSheetModal that pins
 * the BuilderHQ chrome:
 *
 *   · Canvas-tinted backdrop (not pure black) so the surface contrast
 *     reads as a layer, not a void
 *   · Surface-colored sheet background with hairline border on top
 *   · Visible handle for the swipe affordance (subtle, not gimmicky)
 *   · Snap points: by default just a single 75% snap. Pass an array
 *     of percentages for multi-stop sheets ("peek" + "full")
 *   · Auto-haptic on snap landing for the premium feel
 *
 * Usage:
 *   const ref = useRef<BottomSheetModal>(null);
 *   ref.current?.present();
 *
 *   <Sheet ref={ref} snaps={["50%", "90%"]}>
 *     <View>…contents…</View>
 *   </Sheet>
 *
 * Provider:
 *   <BottomSheetModalProvider> is already mounted at the root in
 *   app/_layout.tsx, so consumers just import and use.
 */
import * as React from "react";
import { View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from "@gorhom/bottom-sheet";

import { haptics } from "@/lib/haptics";
import { palette, radii4 } from "@/lib/theme";

interface Props extends Omit<BottomSheetModalProps, "snapPoints"> {
  /** Snap points as percentages or pixel values. Default ["75%"]. */
  snaps?: (string | number)[];
  /** Whether tapping the backdrop dismisses. Default true. */
  dismissOnBackdropTap?: boolean;
  children: React.ReactNode;
}

export const Sheet = React.forwardRef<BottomSheetModal, Props>(function Sheet(
  {
    snaps = ["75%"],
    dismissOnBackdropTap = true,
    children,
    onChange,
    ...rest
  },
  ref,
) {
  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissOnBackdropTap ? "close" : "none"}
        opacity={0.5}
      />
    ),
    [dismissOnBackdropTap],
  );

  const handleChange = React.useCallback<
    NonNullable<BottomSheetModalProps["onChange"]>
  >(
    (index, position, sheetType) => {
      // Soft haptic when sheet lands at a snap (not when dismissed).
      if (index >= 0) void haptics.soft();
      onChange?.(index, position, sheetType);
    },
    [onChange],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snaps}
      onChange={handleChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: palette.surface,
        borderTopLeftRadius: radii4.lg,
        borderTopRightRadius: radii4.lg,
      }}
      handleIndicatorStyle={{
        backgroundColor: palette.textDim,
        width: 36,
        height: 4,
      }}
      handleStyle={{
        paddingTop: 12,
        paddingBottom: 8,
      }}
      {...rest}
    >
      {/* Subtle top-edge hairline accent — premium signal. */}
      <View
        pointerEvents="none"
        style={{
          height: 1,
          marginHorizontal: 32,
          backgroundColor: palette.accentLight,
          opacity: 0.3,
          marginBottom: -1,
        }}
      />
      {children}
    </BottomSheetModal>
  );
});
