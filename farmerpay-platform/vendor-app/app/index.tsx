/**
 * Entry point — checks auth and routes to login or tabs.
 */
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/hooks/useAuth";

export default function Index() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <Redirect
        href="/(protected)/(tabs)"
      />
    );
  }

  return (
    <Redirect href="/(auth)/login" />
  );
}