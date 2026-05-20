import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Stack,
  useRouter,
  useLocalSearchParams,
} from "expo-router";
import { useSetMpin } from "../../src/hooks/useSetMpin";

export default function SetMpinScreen() {
  const router = useRouter();
  const { loading, handleSetMpin } = useSetMpin();

  const { otpRequestId, mobile } = useLocalSearchParams<{
    otpRequestId: string;
    mobile: string;
  }>();

  const [mpin, setMpinValue] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");

  const onSetMpin = async () => {
    if (!otpRequestId || !mobile) {
      Alert.alert("Error", "Required information is missing.");
      return;
    }

    if (mpin.length !== 4) {
      Alert.alert("Validation Error", "Enter a 4-digit MPIN.");
      return;
    }

    if (confirmMpin.length !== 4) {
      Alert.alert("Validation Error", "Confirm your 4-digit MPIN.");
      return;
    }

    if (mpin !== confirmMpin) {
      Alert.alert("Validation Error", "MPINs do not match.");
      return;
    }

    try {
      await handleSetMpin({
        mobile,
        otpRequestId,
        mpin,
        confirmMpin,
      });

      Alert.alert(
        "Success",
        "MPIN set successfully.",
        [
          {
            text: "Continue to Login",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.message || "Unable to set MPIN."
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={styles.title}>Set MPIN</Text>
          <Text style={styles.subtitle}>
            Create a secure 4-digit MPIN
          </Text>

          <Text style={styles.label}>New MPIN</Text>
          <TextInput
            style={styles.mpinInput}
            placeholder="••••"
            value={mpin}
            onChangeText={(text) =>
              setMpinValue(text.replace(/\D/g, ""))
            }
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm MPIN</Text>
          <TextInput
            style={styles.mpinInput}
            placeholder="••••"
            value={confirmMpin}
            onChangeText={(text) =>
              setConfirmMpin(text.replace(/\D/g, ""))
            }
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.btn}
            onPress={onSetMpin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Set MPIN</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>
            Your MPIN will be used to sign in.
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#78350f",
    padding: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },

  icon: {
    fontSize: 48,
    marginBottom: 8,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
  },

  subtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 24,
    textAlign: "center",
  },

  label: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginBottom: 4,
    marginTop: 12,
  },

  mpinInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 12,
  },

  btn: {
    width: "100%",
    backgroundColor: "#d97706",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  footer: {
    marginTop: 16,
    fontSize: 11,
    color: "#aaa",
    textAlign: "center",
  },
});