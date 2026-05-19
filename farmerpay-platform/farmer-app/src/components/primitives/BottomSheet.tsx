import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  type ViewProps,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { neutral } from "../../theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export interface BottomSheetProps extends ViewProps {
  visible: boolean;
  onDismiss: () => void;
  snapPoints?: number[];
  dismissOnPan?: boolean;
  testID?: string;
}

const BottomSheet = React.forwardRef<View, BottomSheetProps>(
  (
    {
      visible,
      onDismiss,
      snapPoints = [0.5],
      dismissOnPan = true,
      testID,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const sheetHeight = SCREEN_HEIGHT * snapPoints[0];

    useEffect(() => {
      if (visible) {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      } else {
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }, [visible, translateY]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => dismissOnPan,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          dismissOnPan && gestureState.dy > 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 100) {
            onDismiss();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
      }),
    ).current;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <Pressable
          style={styles.overlay}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <Animated.View
            ref={ref}
            testID={testID}
            accessibilityLabel="Bottom sheet dialog"
            style={[
              styles.sheet,
              { height: sheetHeight, transform: [{ translateY }] },
              style,
            ]}
            {...panResponder.panHandlers}
            {...props}
          >
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  },
);
BottomSheet.displayName = "BottomSheet";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  keyboardView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[200],
    alignSelf: "center",
    marginBottom: 12,
  },
});

export { BottomSheet };
