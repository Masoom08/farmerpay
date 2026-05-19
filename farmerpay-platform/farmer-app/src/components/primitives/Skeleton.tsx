import React, { useEffect, useRef } from "react";
import { View, Animated, type ViewProps, StyleSheet } from "react-native";
import { neutral } from "../../theme";

export interface MobileSkeletonProps extends ViewProps {
  testID?: string;
}

/** Animated pulse opacity for all skeleton variants */
function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

const SkeletonBase = React.forwardRef<View, MobileSkeletonProps>(
  ({ testID, style, ...props }, ref) => {
    const opacity = usePulse();
    return (
      <Animated.View
        ref={ref}
        testID={testID}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.base, { opacity }, style]}
        {...props}
      />
    );
  },
);
SkeletonBase.displayName = "Skeleton";

function SkeletonScore({ testID, style, ...props }: MobileSkeletonProps) {
  const opacity = usePulse();
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.scoreContainer, style]}
      {...props}
    >
      <Animated.View style={[styles.scoreCircle, { opacity }]} />
      <Animated.View style={[styles.scoreLine, { opacity, width: 96 }]} />
      <Animated.View style={[styles.scoreLine, { opacity, width: 64 }]} />
    </View>
  );
}
SkeletonScore.displayName = "Skeleton.Score";

function SkeletonRow({
  columns = 4,
  testID,
  style,
  ...props
}: MobileSkeletonProps & { columns?: number }) {
  const opacity = usePulse();
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, style]}
      {...props}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Animated.View key={i} style={[styles.cell, { opacity }]} />
      ))}
    </View>
  );
}
SkeletonRow.displayName = "Skeleton.Row";

function SkeletonCell({ testID, style, ...props }: MobileSkeletonProps) {
  const opacity = usePulse();
  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.cell, { opacity }, style]}
      {...props}
    />
  );
}
SkeletonCell.displayName = "Skeleton.Cell";

const Skeleton = Object.assign(SkeletonBase, {
  Score: SkeletonScore,
  Row: SkeletonRow,
  Cell: SkeletonCell,
});

const styles = StyleSheet.create({
  base: {
    height: 16,
    borderRadius: 4,
    backgroundColor: neutral[200],
  },
  scoreContainer: {
    alignItems: "center",
    gap: 8,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: neutral[200],
  },
  scoreLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: neutral[200],
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  cell: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    backgroundColor: neutral[200],
  },
});

export { Skeleton };
