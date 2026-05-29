import { Tabs } from "expo-router";
import { Text, TouchableOpacity, } from "react-native";
import { useState } from "react";
import AppDrawer from "../../../src/components/AppDrawer";
import { Ionicons, MaterialCommunityIcons,} from "@expo/vector-icons";

const icon =
  (emoji: string) => () =>
    (
      <Text style={{ fontSize: 20 }}>
        {emoji}
      </Text>
    );

export default function VendorTabLayout() {
  const [drawerVisible, setDrawerVisible] =
    useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: "#d97706",
          },

          headerTintColor: "#fff",
          tabBarActiveTintColor: "#d97706",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: {
            paddingBottom: 4,
            height: 56,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },

          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                setDrawerVisible(true)
              }
              style={{
                marginRight: 16,
              }}
            >
               <Ionicons
                name="menu"
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",

            headerTitle:
              "FarmerPay Vendor",

            tabBarIcon: ({
              focused,
              color,
            }) => (
              <Ionicons
                name={
                  focused
                    ? "home"
                    : "home-outline"
                }
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="record-sale"
          options={{
            title: "Sell",

            headerTitle:
              "Record Sale",

            tabBarIcon: ({
              focused,
              color,
            }) => (
              <Ionicons
                name={
                  focused
                    ? "cart"
                    : "cart-outline"
                }
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="farmers"
          options={{
            title: "Farmers",

            headerTitle:
              "My Farmers",

            tabBarIcon: ({
              focused,
              color,
            }) => (
              <Ionicons
                name={
                  focused
                    ? "people"
                    : "people-outline"
                }
                size={22}
                color={color}
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="transactions"
          options={{
            title: "Transactions",

            headerTitle:
              "Farmer Transactions",

            tabBarIcon: ({
              focused,
              color,
            }) => (
              <MaterialCommunityIcons
                name={
                  focused
                    ? "swap-horizontal-circle"
                    : "swap-horizontal"
                }
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="catalog"
          options={{
            href: null,
            title: "Catalog",

            headerTitle:
              "Catalog & Inventory",

            tabBarIcon: ({
              focused,
              color,
            }) => (
              <MaterialCommunityIcons
                name={
                  focused
                    ? "package-variant"
                    : "package-variant-closed"
                }
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="credit"
          options={{
            title: "Credit",

            headerTitle:
              "Credit Ledger",

            tabBarIcon: ({
              focused,
              color,
            }) => (
              <MaterialCommunityIcons
                name={
                  focused
                    ? "credit-card"
                    : "credit-card-outline"
                }
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      <AppDrawer
        visible={drawerVisible}
        onClose={() =>
          setDrawerVisible(false)
        }
      />
    </>
  );
}