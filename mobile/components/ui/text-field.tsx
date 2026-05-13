/**
 * <TextField /> — labelled text input with the brand polish:
 *   · Label sits above with the uppercase tracking treatment.
 *   · Container animates its border to accent on focus.
 *   · Optional error line slides under the input.
 *   · Honours iOS dark-mode keyboard appearance + autocapitalize defaults
 *     suited to common form roles (email lowercased, name word-case).
 */
import { forwardRef } from "react";
import {
  type TextInput as RNTextInput,
  TextInput,
  type TextInputProps,
  View,
  Text,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string | null;
  hint?: string;
  /** Optional adornment rendered inside the input, right side. */
  rightAdornment?: React.ReactNode;
}

export const TextField = forwardRef<RNTextInput, TextFieldProps>(
  function TextField(
    { label, error, hint, rightAdornment, onFocus, onBlur, ...rest },
    ref,
  ) {
    const focused = useSharedValue(0);
    const errored = !!error;

    const borderStyle = useAnimatedStyle(() => ({
      borderColor: errored
        ? colors.danger
        : focused.value > 0.5
          ? colors.accent
          : colors.borderStrong,
    }));

    return (
      <View className="w-full">
        <Text className="text-text-dim text-[10.5px] tracking-[0.22em] uppercase font-ui font-medium mb-2">
          {label}
        </Text>

        <Animated.View
          style={borderStyle}
          className={cn(
            "flex-row items-center bg-surface-1/60 rounded-lg border h-12 px-4",
          )}
        >
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.accent}
            keyboardAppearance="dark"
            className="flex-1 text-text text-[15px] py-0"
            onFocus={(e) => {
              focused.value = withTiming(1, { duration: 160 });
              onFocus?.(e);
            }}
            onBlur={(e) => {
              focused.value = withTiming(0, { duration: 160 });
              onBlur?.(e);
            }}
            {...rest}
          />
          {rightAdornment ? <View className="ml-2">{rightAdornment}</View> : null}
        </Animated.View>

        {error ? (
          <Text className="text-danger text-[12px] mt-2">{error}</Text>
        ) : hint ? (
          <Text className="text-text-dim text-[12px] mt-2">{hint}</Text>
        ) : null}
      </View>
    );
  },
);
