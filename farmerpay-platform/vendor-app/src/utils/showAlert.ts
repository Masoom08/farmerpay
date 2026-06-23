import { Alert, Platform } from "react-native";

export function showAlert(
  title: string,
  message: string,
  onOk?: () => void
) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
    return;
  }

  Alert.alert(title, message, [
    {
      text: "OK",
      onPress: onOk,
    },
  ]);
}