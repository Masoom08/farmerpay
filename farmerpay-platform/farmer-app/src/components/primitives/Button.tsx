import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  StyleSheet,
  View,
} from "react-native";
import { brand, neutral } from "../../theme";

export type MobileButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type MobileButtonSize = "sm" | "md" | "lg";

const TOUCH_TARGET = 48;

const variantStyles: Record<MobileButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: brand.primary[700], fg: "#FFFFFF" },
  secondary: { bg: neutral[100], fg: neutral[900] },
  ghost: { bg: "transparent", fg: neutral[800] },
  destructive: { bg: "#B91C1C", fg: "#FFFFFF" },
};

const sizeStyles: Record<MobileButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: TOUCH_TARGET, paddingH: 12, fontSize: 13 },
  md: { height: TOUCH_TARGET, paddingH: 16, fontSize: 14 },
  lg: { height: 56, paddingH: 24, fontSize: 16 },
};

export interface MobileButtonProps extends PressableProps {
  variant?: MobileButtonVariant;
  size?: MobileButtonSize;
  loading?: boolean;
  children: string;
  testID?: string;
}

const Button = React.forwardRef<View, MobileButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      testID,
      style,
      ...props
    },
    ref,
  ) => {
    const vs = variantStyles[variant];
    const ss = sizeStyles[size];
    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityLabel={children}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: vs.bg,
            minHeight: ss.height,
            paddingHorizontal: ss.paddingH,
            opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
          },
          vs.border ? { borderWidth: 1, borderColor: vs.border } : undefined,
          style as any,
        ]}
        {...props}
      >
        {loading && (
          <ActivityIndicator
            size="small"
            color={vs.fg}
            style={styles.spinner}
          />
        )}
        <Text style={[styles.label, { color: vs.fg, fontSize: ss.fontSize }]}>
          {children}
        </Text>
      </Pressable>
    );
  },
);
Button.displayName = "Button";

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    gap: 8,
  },
  label: {
    fontWeight: "600",
  },
  spinner: {
    marginRight: 4,
  },
});

export { Button };
