import React from "react";
import {
  View,
  Text,
  Pressable,
  type ViewProps,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { neutral } from "../../theme";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;

export interface TopBarProps extends ViewProps {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  testID?: string;
}

const TopBar = React.forwardRef<View, TopBarProps>(
  ({ title, left, right, testID, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        testID={testID}
        accessibilityRole="header"
        style={[styles.container, style]}
        {...props}
      >
        <View style={styles.left}>{left}</View>
        <Text
          style={styles.title}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
    );
  },
);
TopBar.displayName = "TopBar";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral[200],
  },
  left: {
    width: 48,
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: neutral[900],
  },
  right: {
    width: 48,
    alignItems: "flex-end",
  },
});

export { TopBar };
