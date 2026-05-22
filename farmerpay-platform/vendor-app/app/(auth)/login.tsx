/**
 * Vendor Login — MPIN-based auth (same as farmer/banker).
 * Demo creds: mobile 9888000001, MPIN 9001
 */
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
// import { apiPost, setToken, setUser } from "../../lib/api";
import { useLogin } from "../../src/hooks/useLogin";

export default function VendorLoginScreen() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
//   const [loading, setLoading] = useState(false);
    const { loading, handleLogin } =useLogin();

//   const handleLogin = async () => {
//     if (mobile.replace(/\D/g, "").length < 10) { Alert.alert("Enter valid mobile"); return; }
//     if (mpin.length !== 4) { Alert.alert("Enter 4-digit MPIN"); return; }

//     setLoading(true);
//     try {
        
//         console.log("LOGIN START");
//         console.log("API BASE", process.env.EXPO_PUBLIC_API_BASE_URL);
//       const r = await apiPost("/auth/login", {
//         mobile: mobile.replace(/\D/g, "").slice(-10),
//         mpin,
//       });
//       if (r.success && r.data?.accessToken) {
//         await setToken(r.data.accessToken);
//         await setUser({
//           name: `${r.data.user?.firstName || ""} ${r.data.user?.lastName || ""}`.trim(),
//           mobile: r.data.user?.mobile,
//           role: r.data.user?.role,
//         });
//         router.replace("/(tabs)" as any);
//       } else {
//         Alert.alert("Login Failed", r.message || "Check your credentials.");
//       }
//     } catch (e: any) {
//       Alert.alert("Error", e?.message === "UNAUTHORIZED" ? "Invalid mobile or MPIN." : "Cannot connect to server.");
//     } finally {
//       setLoading(false);
//     }
//   };

const onLogin = async () => {

  const cleanMobile =
    mobile.replace(/\D/g, "").slice(-10);

  if (cleanMobile.length < 10) {
    Alert.alert("Enter valid mobile");
    return;
  }

  if (mpin.length !== 4) {
    Alert.alert("Enter 4-digit MPIN");
    return;
  }

  try {

    await handleLogin(
      cleanMobile,
      mpin
    );

    router.replace("/(protected)/(tabs)" as any);

  } catch (e: any) {

    Alert.alert(
      "Login Failed",
      e?.message ||
      "Something went wrong"
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
  linkContainer: {
    marginTop: 18,
  },

  linkText: {
    fontSize: 13,
    color: "#d97706",
    fontWeight: "600",
  },
});