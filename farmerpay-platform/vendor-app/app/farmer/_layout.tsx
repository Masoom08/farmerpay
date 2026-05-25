import { Stack } from "expo-router";

export default function FarmerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: {
            backgroundColor: "#d97706",
            
          },
        headerTintColor: "#fff",
      }}
    >
      <Stack.Screen
        name="add-farmer"
        options={{
          title: "Add Farmer",
        }}
      />

      <Stack.Screen
        name="add-transaction"
        options={{
          title: "Add Transaction",
        }}
      />

      <Stack.Screen
        name="give-credit"
        options={{
          title: "Give Credit",
        }}
      />
    </Stack>
  );
}