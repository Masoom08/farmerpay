import React from "react";
import { View, Text, type ViewProps, StyleSheet } from "react-native";
import { neutral } from "../../theme";

export interface MobileEmptyStateProps extends ViewProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  testID?: string;
}

const EmptyState = React.forwardRef<View, MobileEmptyStateProps>(
  ({ icon, title, description, action, testID, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        testID={testID}
        accessibilityRole="text"
        style={[styles.container, style]}
        {...props}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
        {action && <View style={styles.action}>{action}</View>}
      </View>
    );
  },
);
EmptyState.displayName = "EmptyState";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[900],
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: neutral[500],
    textAlign: "center",
    marginTop: 4,
    maxWidth: 260,
  },
  action: {
    marginTop: 16,
  },
});

export { EmptyState };
