import React from "react";
import { View, Text, type ViewProps, StyleSheet } from "react-native";
import { bandColors, decision } from "../../theme";

export type MobileBadgeVariant =
  | "default"
  | "sanction"
  | "reconsider"
  | "reject"
  | "band-excellent"
  | "band-good"
  | "band-building"
  | "band-starting";

const variantStyles: Record<
  MobileBadgeVariant,
  { bg: string; fg: string }
> = {
  default: { bg: "#E5E5E5", fg: "#262626" },
  sanction: { bg: decision.sanction.bg, fg: decision.sanction.fg },
  reconsider: { bg: decision.reconsider.bg, fg: decision.reconsider.fg },
  reject: { bg: decision.reject.bg, fg: decision.reject.fg },
  "band-excellent": { bg: bandColors.excellent, fg: "#15803D" },
  "band-good": { bg: bandColors.good, fg: "#15803D" },
  "band-building": { bg: "#FEF3C7", fg: "#92400E" },
  "band-starting": { bg: bandColors.starting, fg: "#262626" },
};

export interface MobileBadgeProps extends ViewProps {
  variant?: MobileBadgeVariant;
  label: string;
  testID?: string;
}

const Badge = React.forwardRef<View, MobileBadgeProps>(
  ({ variant = "default", label, testID, style, ...props }, ref) => {
    const vs = variantStyles[variant];
    return (
      <View
        ref={ref}
        testID={testID}
        accessibilityRole="text"
        accessibilityLabel={label}
        style={[styles.badge, { backgroundColor: vs.bg }, style]}
        {...props}
      >
        <Text style={[styles.label, { color: vs.fg }]}>{label}</Text>
      </View>
    );
  },
);
Badge.displayName = "Badge";

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export { Badge };
