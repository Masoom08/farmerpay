import { Alert, Platform } from "react-native";

export function showChoiceAlert(
  title: string,
  message: string,
  options: {
    forgotMpin: () => void;
    signIn: () => void;
  }
) {
  if (Platform.OS === "web") {
    const choice = window.prompt(
      `${title}\n\n${message}\n\nType:\n1 → Forgot MPIN\n2 → Sign In`
    );

    if (choice === "1") {
      options.forgotMpin();
    } else if (choice === "2") {
      options.signIn();
    }

    return;
  }

  Alert.alert(title, message, [
    {
      text: "Forgot MPIN",
      onPress: options.forgotMpin,
    },
    {
      text: "Sign In",
      onPress: options.signIn,
    },
    {
      text: "Cancel",
      style: "cancel",
    },
  ]);
}