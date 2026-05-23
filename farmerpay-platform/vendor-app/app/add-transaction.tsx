import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";

import CreateTransactionForm
  from "../src/components/CreateTransactionForm";

export default function
AddTransactionScreen() {

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text style={styles.title}>
        Add Transaction
      </Text>

      <CreateTransactionForm
        farmerId={13}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fffbeb",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 14,
    color: "#111",
  },
});