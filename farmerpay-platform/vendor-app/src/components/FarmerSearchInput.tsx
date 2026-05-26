import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import type { Farmer } from "../types/farmer.types";

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
  const [open, setOpen] = useState(false);

  const handleSelect = (farmer: Farmer) => {
  console.log(
    "======== FARMER CLICKED ========"
  );

  console.log("farmer:", farmer);

  onSelectFarmer(farmer);

  setOpen(false);
};

  const defaultFarmers = farmers;

  const filteredFarmers =
    query.trim().length === 0
      ? []
      : farmers.filter((farmer) => {
          const search =
            query.toLowerCase();

          return (
            farmer.name
              .toLowerCase()
              .includes(search) ||
            farmer.mobile.includes(search)
          );
        });

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Search farmer name or mobile"
          value={query}
          onPressIn={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onChangeText={(text) => {
            onChangeQuery(text);
            setOpen(true);
          }}
        />

        <TouchableOpacity
          onPress={() => setOpen(!open)}
          style={styles.arrowButton}
        >
          <Text style={styles.arrow}>
            {open ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>
      </View>

      {open && (
        <View style={styles.dropdown}>
          <Text style={styles.dropdownTitle}>
            Farmers
          </Text>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator
                size="small"
                color="#d97706"
              />

              <Text style={styles.loadingText}>
                Loading farmers...
              </Text>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownScroll}
            >
              {query.trim().length === 0 ? (
                defaultFarmers.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No farmers available
                  </Text>
                ) : (
                  defaultFarmers.map((farmer) => (
                    <TouchableOpacity
                      key={farmer.farmerId}
                      style={[
                        styles.resultItem,
                        selectedFarmer?.farmerId ===
                          farmer.farmerId && {
                          backgroundColor:
                            "#fef3c7",
                        },
                      ]}
                      onPress={() =>
                        handleSelect(farmer)
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.resultName
                          }
                        >
                          {farmer.name}
                        </Text>

                        <Text
                          style={
                            styles.resultMobile
                          }
                        >
                          {farmer.mobile}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.badgeContainer
                        }
                      >
                        <Text
                          style={styles.badge}
                        >
                          {farmer.linkType.replace(
                            "_",
                            " "
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )
              ) : filteredFarmers.length ===
                0 ? (
                <Text style={styles.emptyText}>
                  No matching farmers
                </Text>
              ) : (
                filteredFarmers.map(
                  (farmer) => (
                    <TouchableOpacity
                      key={farmer.farmerId}
                      style={[
                        styles.resultItem,
                        selectedFarmer?.farmerId ===
                          farmer.farmerId && {
                          backgroundColor:
                            "#fef3c7",
                        },
                      ]}
                      onPress={() =>
                        handleSelect(
                          farmer
                        )
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.resultName
                          }
                        >
                          {farmer.name}
                        </Text>

                        <Text
                          style={
                            styles.resultMobile
                          }
                        >
                          {farmer.mobile}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.badgeContainer
                        }
                      >
                        <Text
                          style={styles.badge}
                        >
                          {farmer.linkType.replace(
                            "_",
                            " "
                          )}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                )
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

export default FarmerSearchInput;

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 999,
  },

  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 48,
    fontSize: 16,
  },

  arrowButton: {
    position: "absolute",
    right: 14,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  arrow: {
    fontSize: 12,
    color: "#444",
  },

  dropdown: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    overflow: "hidden",
    zIndex: 1000,
    elevation: 10,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  dropdownTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },

  dropdownScroll: {
    maxHeight: 260,
  },

  loaderContainer: {
    paddingVertical: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#6b7280",
  },

  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },

  resultName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  resultMobile: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },

  badgeContainer: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400e",
    textTransform: "capitalize",
  },

  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 13,
    color: "#9ca3af",
  },
});