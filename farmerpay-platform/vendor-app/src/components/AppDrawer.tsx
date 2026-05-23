import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Alert
} from "react-native";

import {
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useLogout } from "../hooks/useLogout";

const DRAWER_WIDTH = 300;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AppDrawer({
  visible,
  onClose,
}: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const { handleLogout: logoutUser } =
    useLogout();

  const slideAnim = useRef(
    new Animated.Value(DRAWER_WIDTH)
  ).current;

  const [showModal, setShowModal] =
    useState(visible);

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



  const handleLogout = () => {
  Alert.alert(
    "Logout",
    "Are you sure you want to logout?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
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
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [
                {
                  translateX: slideAnim,
                },
              ],
            },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={closeDrawer}
            >
              <Ionicons
                name="arrow-back"
                size={28}
                color="#111"
              />
            </TouchableOpacity>
          </View>

          {/* Profile */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) ||
                  "U"}
              </Text>
            </View>

            <Text style={styles.name}>
              {user?.name || "Vendor"}
            </Text>

            <Text style={styles.role}>
              {user?.role || "VENDOR"}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Mobile
            </Text>

            <Text style={styles.value}>
              {user?.mobile || "-"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Email
            </Text>

            <Text style={styles.value}>
              {user?.email || "-"}
            </Text>
          </View>

          <View style={{ flex: 1 }} />

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

  topBar: {
    marginBottom: 20,
  },

  header: {
    alignItems: "center",
    marginBottom: 35,
  },

  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#d97706",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  avatarText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  role: {
    marginTop: 5,
    color: "#777",
    fontSize: 14,
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
});