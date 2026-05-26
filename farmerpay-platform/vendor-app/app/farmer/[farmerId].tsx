import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

export default function FarmerDetailScreen() {
  const { farmerId } = useLocalSearchParams();

  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Farmer #{farmerId}
      </Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() =>
          router.push(
            `/farmer/orders?farmerId=${farmerId}` as any
          )
        }
      >
        <Text style={styles.btnText}>
          View Orders
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fffbeb",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
  },

  btn: {
    marginTop: 20,
    backgroundColor: "#d97706",
    padding: 14,
    borderRadius: 12,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});