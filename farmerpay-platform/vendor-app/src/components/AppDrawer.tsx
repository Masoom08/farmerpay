import React, { useEffect, useRef, useState,} from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Alert,
  Platform, 
  ScrollView
} from "react-native";

import { Ionicons, MaterialIcons} from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useLogout } from "../hooks/useLogout";
import {getVendorProfile} from "../api/modules/vendor.api"
import {
  getStates,
  getDistricts,
  getBlocks
} from "../api/modules/lgd.api";
import { useUpdateVendorProfile } from "../hooks/useVendor";

const DRAWER_WIDTH = 300;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AppDrawer({ visible, onClose}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { handleLogout: logoutUser } = useLogout();
  const slideAnim = useRef( new Animated.Value(DRAWER_WIDTH)).current;
  const [showModal, setShowModal] = useState(visible);
  const [profile, setProfile] = useState<any>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [locationNames, setLocationNames] = useState({
    state: "-",
    district: "-",
    block: "-"
  });
  const { loading, handleUpdateProfile } = useUpdateVendorProfile();
  const [editForm, setEditForm] = useState({
    vendorName: "",
    shopAddress: "",
    stateId: 0,
    districtId: 0,
    blockId: 0,
  });

  useEffect(() => {
    if (visible) {
      setShowModal(true);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const res = await getVendorProfile();

    if (res.success) {
      setProfile(res.data);
      await loadLocationNames(res.data);
    }
  };

  const loadLocationNames = async (profileData: any) => {
    const serviceArea = profileData?.serviceAreas?.[0];
    if (!serviceArea) return;

    const stateId = serviceArea.lgd_state_id;
    const districtId = serviceArea.lgd_district_id;
    const blockId = serviceArea.lgd_block_id;

    const states = await getStates();
    const districts = await getDistricts(stateId);
    const blocks = await getBlocks(districtId);

    const state = states.find(
      (s: any) => Number(s.stateId) === Number(stateId)
    );

    const district = districts.find(
      (d: any) => Number(d.districtId) === Number(districtId)
    );

    const block = blocks.find(
      (b: any) => Number(b.blockId) === Number(blockId)
    );

    setLocationNames({
      state: state?.stateName || "-",
      district: district?.districtName || "-",
      block: block?.blockName || "-"
    });
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to logout?"
      );

      if (!confirmed) return;

      closeDrawer();

      setTimeout(async () => {
        await logoutUser();
        router.replace("/login");
      }, 250);

      return;
    }

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            closeDrawer();
            setTimeout(async () => {
              await logoutUser();
              router.replace("/login");
            }, 250);
          },
        },
      ]
    );
  };

  if (!showModal) return null;

  const SectionTitle = ({ icon, title }: any) => (
    <Text style={styles.sectionTitle}>
      {icon} {title}
    </Text>
  );

  const openEditModal = () => {
    setEditForm({
      vendorName: profile?.profile?.vendor_name || "",
      shopAddress: profile?.shops?.[0]?.shop_address || "",
      stateId: profile?.serviceAreas?.[0]?.lgd_state_id || 0,
      districtId: profile?.serviceAreas?.[0]?.lgd_district_id || 0,
      blockId: profile?.serviceAreas?.[0]?.lgd_block_id || 0,
    });
    setEditVisible(true);
  };

  const handleSave = async () => {
  console.log("SAVE CLICKED");
  console.log("payload", editForm);
    try {
      await handleUpdateProfile(editForm);

      Alert.alert(
        "Success",
        "Profile updated successfully"
      );

      setEditVisible(false);
      await loadProfile();
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update profile"
      );
    }
  };


  return (
    <Modal
      transparent
      visible={showModal}
      statusBarTranslucent
    >
      <View style={styles.container}>

        {/* Overlay */}
        <Pressable
          style={styles.overlay}
          onPress={closeDrawer}
        />

        {/* Animated Drawer */}
        <Animated.View style={[styles.drawer,{transform: [{translateX: slideAnim }] }]}>
          {/* Top Bar */}
          <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.profileRow}>
            {/* C1 */}
            <TouchableOpacity style={styles.arrowCol} onPress={closeDrawer}>
              <Ionicons name="arrow-back" size={28} color="#111" />
            </TouchableOpacity>

            {/* C2 */}
            <View style={styles.avatarCol}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0) || "U"}
                </Text>
              </View>
            </View>

            {/* C3 */}
            <View style={styles.infoCol}>
              <Text style={styles.name}>{user?.name || "Vendor"}</Text>
              <Text style={styles.role}>{user?.role || "VENDOR"}</Text>
            </View>
          </View>

            {/* PERSONAL DETAILS */}
          <SectionTitle icon="👤" title="Personal Details" />

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>
              {profile?.profile?.vendor_name || user?.name || "-"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Mobile</Text>
            <Text style={styles.infoValue}>
              {user?.mobile || "-"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>
              {user?.email || "-"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Vendor Type</Text>
            <Text style={styles.infoValue}>
              {profile?.profile?.vendor_type || "-"}
            </Text>
          </View>

          {/* SHOP DETAILS */}
          <SectionTitle icon="🏪" title="Shop Details" />

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Shop Name</Text>
            <Text style={styles.infoValue}>
              {profile?.profile?.shop_name || "-"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Vendor Code</Text>
            <Text style={styles.infoValue}>
              {profile?.profile?.vendor_code || "-"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Shop Address</Text>
            <Text style={styles.infoValue}>
              {profile?.shops?.[0]?.shop_address || "-"}
            </Text>
          </View>

          {/* SERVICE AREA */}
          <SectionTitle icon="📍" title="Service Area" />

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>State ID</Text>
            <Text style={styles.infoValue}>
              {locationNames.state}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>District ID</Text>
            <Text style={styles.infoValue}>
              {locationNames.district}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Block ID</Text>
            <Text style={styles.infoValue}>
              {locationNames.block}
            </Text>
          </View>

          {/* KYC DETAILS */}
          <SectionTitle icon="📄" title="KYC Details" />

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>KYC Status</Text>
            <Text
              style={[
                styles.kycBadge,
                {
                  color:
                    profile?.kycStatus === "approved"
                      ? "#16a34a"
                      : profile?.kycStatus === "rejected"
                      ? "#dc2626"
                      : "#d97706",
                },
              ]}
            >
              {profile?.kycStatus || "Pending"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>GST Verified</Text>
            <Text style={styles.infoValue}>
              {profile?.profile?.kyc?.gst_certificate_verified ? "Yes" : "No"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Bank Verified</Text>
            <Text style={styles.infoValue}>
              {profile?.profile?.kyc?.bank_account_verified ? "Yes" : "No"}
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.editBtn}
            onPress={openEditModal}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutRow}
            onPress={handleLogout}
            
          >
            <MaterialIcons
              name="logout"
              size={24}
              color="#dc2626"
            />

            <Text style={styles.logoutText}>
                Logout
            </Text>            
          </TouchableOpacity>
          </ScrollView>

          <Modal visible={editVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Edit Profile</Text>

                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.vendorName}
                  onChangeText={(text) =>
                    setEditForm(prev => ({
                      ...prev,
                      vendorName: text
                    }))
                  }
                />

                <Text style={styles.inputLabel}>Mobile</Text>
                <TextInput
                  style={[styles.input, styles.disabled]}
                  editable={false}
                  value={user?.mobile || ""}
                />

                <Text style={styles.inputLabel}>Shop Address</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.shopAddress}
                  onChangeText={(text) =>
                    setEditForm(prev => ({
                      ...prev,
                      shopAddress: text
                    }))
                  }
                />

                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  value={locationNames.state}
                  editable={false}
                />

                <Text style={styles.inputLabel}>District</Text>
                <TextInput
                  style={styles.input}
                  value={locationNames.district}
                  editable={false}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setEditVisible(false)}>
                    <Text>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>{loading ? "Saving..." : "Save"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(0,0,0,0.35)",
  },

  drawer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "#fffbeb",
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 35,
    elevation: 12,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  arrowCol: {
    marginRight: 18,
  },

  avatarCol: {
    marginRight: 14,
  },

  infoCol: {
    justifyContent: "center",
  },

  topBar: {
    marginBottom: 20,
  },

  header: {
    alignItems: "center",
    // marginBottom: 35,
  },

  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#d97706",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  role: {
    marginTop: 2,
    color: "#777",
    fontSize: 12,
    fontWeight: "600",
  },

  section: {
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    paddingBottom: 12,
  },

  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 6,
  },

  value: {
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },

  logoutText: {
    color: "#dc2626",
    fontSize: 17,
    fontWeight: "700",
  },

sectionTitle: {
  fontSize: 14,
  fontWeight: "700",
  color: "#92400e",
  marginTop: 14,
  marginBottom: 8,
},

infoCard: {
  backgroundColor: "#fff",
  padding: 12,
  borderRadius: 12,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: "#f3e8d0",
},

infoLabel: {
  fontSize: 12,
  color: "#888",
},

infoValue: {
  fontSize: 15,
  fontWeight: "600",
  color: "#111",
  marginTop: 4,
},

kycBadge: {
  marginTop: 6,
  fontWeight: "700",
  textTransform: "capitalize",
},

editBtn: {
  backgroundColor: "#d97706",
  paddingVertical: 12,
  borderRadius: 12,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
},

editText: {
  color: "#fff",
  fontWeight: "700",
},

modalOverlay: {
  flex: 1,
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.4)",
  padding: 20,
},

modalBox: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 20,
},

modalTitle: {
  fontSize: 18,
  fontWeight: "700",
  marginBottom: 18,
},

input: {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 10,
  padding: 12,
  marginBottom: 12,
},

inputLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#555",
  marginBottom: 6,
  marginTop: 8,
},

saveBtn: {
  backgroundColor: "#d97706",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 10,
},

disabled: {
  backgroundColor: "#f3f4f6",
  color: "#999",
},

modalActions: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 8,
},
});