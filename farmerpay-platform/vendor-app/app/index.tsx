/**
 * Entry point — checks auth and routes to login or tabs.
 */
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { getToken } from "../lib/api";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    getToken().then((t) => {
      if (t) router.replace("/(tabs)" as any);
      else router.replace("/login" as any);
    });
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#d97706" />
    </View>
  );
}
