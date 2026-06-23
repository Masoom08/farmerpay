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
import { useVerifyOtp } from "../../src/hooks/useVerifyOtp";
import { showAlert } from "../../src/utils/showAlert";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { loading, handleVerifyOtp } = useVerifyOtp();

  const { otpRequestId, mobile } = useLocalSearchParams<{
    otpRequestId: string;
    mobile: string;
  }>();

  const [otpCode, setOtpCode] = useState("");

  const onVerifyOtp = async () => {
    if (!otpRequestId) {
      showAlert("Error", "OTP request ID is missing.");
      return;
    }

    if (otpCode.length !== 6) {
      showAlert("Validation Error", "Enter the 6-digit OTP.");
      return;
    }

    try {
      await handleVerifyOtp({
        otpRequestId,
        otpCode,
      });

      showAlert(
        "Verified",
        "OTP verified successfully.",
        () =>
          router.push({
            pathname: "/set-mpin",
            params: {
              otpRequestId,
              mobile,
            },
          })
      );
    } catch (error: any) {
      showAlert(
        "Verification Failed",
        error?.message || "Invalid OTP."
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP sent to {mobile}
          </Text>

          <Text style={styles.label}>OTP Code</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="123456"
            value={otpCode}
            onChangeText={(text) =>
              setOtpCode(text.replace(/\D/g, ""))
            }
            keyboardType="numeric"
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.btn}
            onPress={onVerifyOtp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.back()}
          >
            <Text style={styles.linkText}>Go Back</Text>
          </TouchableOpacity>
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

  otpInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
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

  linkContainer: {
    marginTop: 18,
  },

  linkText: {
    fontSize: 13,
    color: "#d97706",
    fontWeight: "600",
  },
});