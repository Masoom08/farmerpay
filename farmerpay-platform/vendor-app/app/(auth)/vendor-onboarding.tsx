import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Dropdown } from "react-native-element-dropdown";

import {
  getStates,
  getDistricts,
  getBlocks,
} from "../../src/api/modules/lgd.api";
import { useVendor } from "../../src/hooks/useVendor";
import { showAlert } from "../../src/utils/showAlert";

export default function VendorOnboardingScreen() {
  const router = useRouter();

  const {
    loading,
    handleVendorOnboarding,
    } = useVendor();


  //const [loading, setLoading] = useState(false);

  const [vendorName, setVendorName] = useState("");
  const [vendorType, setVendorType] = useState("");
  const [shopName, setShopName] = useState("");

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [selectedState, setSelectedState] = useState<any>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    try {
      const data = await getStates();
      setStates(data);
    } catch (error) {
      console.log(error);
    }
  };

  const onStateSelect = async (state: any) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    setSelectedBlock(null);

    try {
      const data = await getDistricts(state.stateId);
      setDistricts(data);
    } catch (error) {
      console.log(error);
    }
  };

  const onDistrictSelect = async (district: any) => {
    setSelectedDistrict(district);
    setSelectedBlock(null);

    try {
      const data = await getBlocks(district.districtId);
      setBlocks(data);
    } catch (error) {
      console.log(error);
    }
  };

  const onSubmit = async () => {
  if (!vendorName.trim()) {
    return showAlert(
      "Validation",
      "Vendor Name is required"
    );
  }

  if (!vendorType) {
    return showAlert(
      "Validation",
      "Vendor Type is required"
    );
  }

  if (!shopName.trim()) {
    return showAlert(
      "Validation",
      "Shop Name is required"
    );
  }

  if (!selectedState) {
    return showAlert(
      "Validation",
      "Please select state"
    );
  }

  if (!selectedDistrict) {
    return showAlert(
      "Validation",
      "Please select district"
    );
  }

  if (!selectedBlock) {
    return showAlert(
      "Validation",
      "Please select block"
    );
  }

  try {
    
    const payload = {
      vendorName: vendorName.trim(),
      vendorType,
      shopName: shopName.trim(),
      stateId: selectedState.stateId,
      districtId: selectedDistrict.districtId,
      blockId: selectedBlock.blockId,
    };
    console.log(
      "VENDOR PAYLOAD",
      JSON.stringify(payload, null, 2)
    );

    const response =
      await handleVendorOnboarding(payload);

    console.log(
      "Vendor Onboarding Success",
      response
    );

    showAlert(
      "Success",
      "Vendor onboarding completed successfully",
      () => router.replace("/(protected)/(tabs)")
    );
  } catch (error: any) {
  console.log(
    "ONBOARDING ERROR",
    JSON.stringify(error?.response?.data, null, 2)
  );

  console.log(
    "STATUS",
    error?.response?.status
  );

  showAlert(
    "Error",
    error?.response?.data?.message ||
      "Unable to complete onboarding"
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
          <Text style={styles.icon}>🏪</Text>

          <Text style={styles.title}>
            Vendor Onboarding
          </Text>

          <Text style={styles.subtitle}>
            Complete your vendor profile
          </Text>

          <Text style={styles.label}>Vendor Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter vendor name"
            value={vendorName}
            onChangeText={setVendorName}
          />

          <Text style={styles.label}>Vendor Type *</Text>

          <Dropdown
            style={styles.dropdown}
            data={[
  {
    label: "Seeds Distributor",
    value: "seeds_distributor",
  },
  {
    label: "Fertilizer Supplier",
    value: "fertilizer_supplier",
  },
  {
    label: "Pesticide Dealer",
    value: "pesticide_dealer",
  },
  {
    label: "Equipment Supplier",
    value: "equipment_supplier",
  },
  {
    label: "Multipurpose Dealer",
    value: "multipurpose_dealer",
  },
]}
            labelField="label"
            valueField="value"
            placeholder="Select Vendor Type"
            value={vendorType}
            onChange={(item) =>
              setVendorType(item.value)
            }
          />

          <Text style={styles.label}>Shop Name *</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter shop name"
            value={shopName}
            onChangeText={setShopName}
          />

          <Text style={styles.label}>State *</Text>

          <Dropdown
            style={styles.dropdown}
            data={states}
            labelField="stateName"
            valueField="stateId"
            placeholder="Select State"
            value={selectedState?.stateId}
            onChange={onStateSelect}
          />

          <Text style={styles.label}>District *</Text>

          <Dropdown
            style={styles.dropdown}
            data={districts}
            labelField="districtName"
            valueField="districtId"
            placeholder="Select District"
            value={selectedDistrict?.districtId}
            disable={!selectedState}
            onChange={onDistrictSelect}
          />

          <Text style={styles.label}>Block *</Text>

          <Dropdown
            style={styles.dropdown}
            data={blocks}
            labelField="blockName"
            valueField="blockId"
            placeholder="Select Block"
            value={selectedBlock?.blockId}
            disable={!selectedDistrict}
            onChange={(item) =>
              setSelectedBlock(item)
            }
          />

          <TouchableOpacity
            style={styles.button}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                Complete Onboarding
              </Text>
            )}
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
    padding: 20,
    backgroundColor: "#78350f",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },

  icon: {
    fontSize: 50,
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: "#111827",
  },

  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
    color: "#374151",
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },

  button: {
    backgroundColor: "#d97706",
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});