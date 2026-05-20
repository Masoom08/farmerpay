import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import type { Farmer } from "../types/sale.types";

interface FarmerSearchInputProps {
  query: string;
  onChangeQuery: (text: string) => void;
  farmers: Farmer[];
  loading: boolean;
  selectedFarmer: Farmer | null;
  onSelectFarmer: (farmer: Farmer) => void;
}

const FarmerSearchInput: React.FC<FarmerSearchInputProps> = ({
  query,
  onChangeQuery,
  farmers,
  loading,
  selectedFarmer,
  onSelectFarmer,
}) => {
  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Search by farmer name or mobile"
        value={query}
        onChangeText={onChangeQuery}
        keyboardType="default"
      />

      {loading && (
        <ActivityIndicator
          style={styles.loader}
          size="small"
          color="#d97706"
        />
      )}

      {selectedFarmer && (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedName}>
            {selectedFarmer.name}
          </Text>
          <Text style={styles.selectedMobile}>
            {selectedFarmer.mobile}
          </Text>
        </View>
      )}

      {!selectedFarmer &&
        query.trim().length >= 2 &&
        farmers.length > 0 && (
          <View style={styles.results}>
            {farmers.map((farmer) => (
              <TouchableOpacity
                key={farmer.id}
                style={styles.resultItem}
                onPress={() => onSelectFarmer(farmer)}
              >
                <Text style={styles.resultName}>
                  {farmer.name}
                </Text>
                <Text style={styles.resultMobile}>
                  {farmer.mobile}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
    </View>
  );
};

export default FarmerSearchInput;

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },

  loader: {
    marginTop: 8,
  },

  results: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
  },

  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  resultName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  resultMobile: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },

  selectedCard: {
    marginTop: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#16a34a",
    borderRadius: 10,
    padding: 12,
  },

  selectedName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },

  selectedMobile: {
    marginTop: 2,
    fontSize: 12,
    color: "#15803d",
  },
});