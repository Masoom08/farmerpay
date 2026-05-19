import React from "react";
import { View, type ViewProps, StyleSheet } from "react-native";

export interface CardProps extends ViewProps {
  testID?: string;
}

const Card = React.forwardRef<View, CardProps>(
  ({ style, testID, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        testID={testID}
        role="summary"
        style={[styles.card, style]}
        {...props}
      >
        {children}
      </View>
    );
  },
);
Card.displayName = "Card";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});

export { Card };
