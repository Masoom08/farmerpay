/**
 * Vendor Login — MPIN-based auth (same as farmer/banker).
 * Demo creds: mobile 9888000001, MPIN 9001
 */
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useLogin } from "../../src/hooks/useLogin";
import { getVendorProfile } from "../../src/api/modules/vendor.api";
import { showAlert } from "../../src/utils/showAlert";

export default function VendorLoginScreen() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
  const { loading, handleLogin } =useLogin();

const onLogin = async () => {

  const cleanMobile =
    mobile.replace(/\D/g, "").slice(-10);

  if (cleanMobile.length < 10) {
    showAlert("Validation Error", "Enter valid mobile");
    return;
  }

  if (mpin.length !== 4) {
    showAlert("Validation Error", "Enter 4-digit MPIN");
    return;
  }

  try {

  await handleLogin(
    cleanMobile,
    mpin
  );

  try {

    const profile =
      await getVendorProfile();

    console.log(
      "VENDOR PROFILE",
      profile
    );

    router.replace(
      "/(protected)/(tabs)" as any
    );

  } catch (profileError: any) {

    const errorCode =
      profileError?.response?.data?.errorCode;

    if (errorCode === "RES_001") {

      router.replace(
        "/(auth)/vendor-onboarding"
      );

      return;
    }

    throw profileError;
  }

} catch (e: any) {
  const status = e?.response?.status;
  const errorCode = e?.response?.data?.errorCode;

  if (
    status === 401 ||
    errorCode === "AUTH_001" ||
    e?.message === "UNAUTHORIZED"
  ) {
    showAlert(
      "Account Not Found",
      "Your account doesn't exist. Please register before signing in."
    );
    return;
  }

  showAlert(
    "Login Failed",
    "Unable to sign in. Please try again."
  );
}
};
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.icon}>🏪</Text>
          <Text style={styles.title}>FarmerPay Vendor</Text>
          <Text style={styles.subtitle}>Input Seller / Aggregator Portal</Text>

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput style={styles.input} placeholder="10-digit mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={13} />

          <Text style={styles.label}>MPIN</Text>
          <TextInput style={styles.mpinInput} placeholder="••••" value={mpin} onChangeText={(t) => setMpin(t.replace(/\D/g, ""))} keyboardType="numeric" maxLength={4} secureTextEntry={true} />

          <TouchableOpacity style={styles.btn} onPress={onLogin} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <Text style={styles.footer}>No passwords. 4-digit UPI-style MPIN.</Text>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.linkText}>
              Don't have an account? Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#78350f", padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, alignItems: "center" },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { fontSize: 13, color: "#888", marginBottom: 24 },
  label: { alignSelf: "flex-start", fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 4, marginTop: 12 },
  input: { width: "100%", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 14, fontSize: 16 },
  mpinInput: { width: "100%", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 14, fontSize: 24, textAlign: "center", letterSpacing: 12 },
  btn: { width: "100%", backgroundColor: "#d97706", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  footer: { marginTop: 16, fontSize: 11, color: "#aaa" },
  linkContainer: { marginTop: 18,},
  linkText: { fontSize: 13, color: "#d97706", fontWeight: "600",},
});