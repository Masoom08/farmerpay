import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useRegister } from "../../src/hooks/useRegister";

export default function RegisterScreen() {
  const router = useRouter();
  const { loading, handleRegister } = useRegister();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const onRegister = async () => {
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);

    if (!firstName.trim()) {
      Alert.alert("Validation Error", "Enter first name.");
      return;
    }

    if (!lastName.trim()) {
      Alert.alert("Validation Error", "Enter last name.");
      return;
    }

    if (cleanMobile.length !== 10) {
      Alert.alert("Validation Error", "Enter valid 10-digit mobile number.");
      return;
    }

    try {
      const response = await handleRegister({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile: cleanMobile,
         ...(email.trim() ? { email: email.trim() } : {}),
      });

      Alert.alert("OTP Sent", response.message || "Verification code sent.");

      router.push({
        pathname: "/verify-otp",
        params: {
          otpRequestId: response.data.otpRequestId,
          mobile: cleanMobile,
        },
      });
    } catch (error: any) {
  const response = error?.response?.data;

  if (response?.errorCode === "ACCOUNT_ALREADY_EXISTS") {
    Alert.alert(
      "Account Already Exists",
      response.message,
      [
        {
          text: "Forgot MPIN",
          onPress: () =>
            router.push({
              pathname: "/forgot-mpin",
              params: { mobile: cleanMobile },
            }),
        },
        {
          text: "Sign In",
          onPress: () => router.replace("/login"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
    return;
  }

  Alert.alert(
    "Registration Failed",
    response?.message || error?.message || "Unable to register."
  );
}
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.icon}>📝</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Register to continue with FarmerPay Vendor
          </Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter first name"
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter last name"
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={13}
          />

          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.btn}
            onPress={onRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.linkText}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
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