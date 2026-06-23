/**
 * Credit Ledger — Who owes how much, payment tracking.
 */
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Modal, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { formatRupees } from "../../../src/utils/currency";
import {
  getCreditLedger,
  recordPayment,
} from "../../../src/api/modules/credit.api";
import { showAlert } from "../../../src/utils/showAlert";

export default function CreditLedgerScreen() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payFarmerId, setPayFarmerId] = useState<number | null>(null);
  const [payFarmerName, setPayFarmerName] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getCreditLedger();
      if (r.success && Array.isArray(r.data)) setEntries(r.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalOutstanding = entries.reduce((sum, e) => sum + Number(e.current_balance || e.currentBalance || 0), 0);
  const totalGiven = entries.reduce((sum, e) => sum + Number(e.total_credit_given || e.totalCreditGiven || 0), 0);
  const totalCollected = entries.reduce((sum, e) => sum + Number(e.total_payments_received || e.totalPaymentsReceived || 0), 0);

const handlePayment = async () => {
  const amount = parseFloat(
    payAmount.replace(/[^0-9.]/g, "")
  );

  if (isNaN(amount) || amount <= 0) {
    showAlert(
      "Invalid Amount",
      "Please enter valid amount"
    );
    return;
  }

  if (!payFarmerId) {
    showAlert(
      "Error",
      "Farmer ID missing"
    );
    return;
  }

  setPaying(true);

  try {
    const payload = {
      paymentAmount: amount,
      paymentDate: new Date().toISOString(),
    };

    console.log("FINAL PAYLOAD =>", payload);

    const r = await recordPayment(
      payFarmerId,
      payload
    );

    console.log("SUCCESS =>", r);

    if (r.success) {
      showAlert(
        "Payment Recorded",
        `${formatRupees(amount)} received from ${payFarmerName}.`
      );

      setPayModal(false);
      setPayAmount("");

      await load();
    } else {
      showAlert(
        "Error",
        r.message || "Failed"
      );
    }

  } catch (e: any) {
    console.log(
      "BACKEND ERROR =>",
      e?.response?.data
    );

    showAlert(
      "Payment Failed",
      e?.response?.data?.message ||
      "Something went wrong"
    );
  } finally {
    setPaying(false);
  }
};

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#d97706"]} />}
      >
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: "#dc2626" }]}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{formatRupees(totalOutstanding)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#d97706" }]}>
            <Text style={styles.summaryLabel}>Total Given</Text>
            <Text style={styles.summaryValue}>{formatRupees(totalGiven)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#16a34a" }]}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{formatRupees(totalCollected)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>FARMER CREDIT ({entries.length})</Text>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40 }}>💳</Text>
            <Text style={styles.emptyTitle}>No credit given</Text>
            <Text style={styles.emptyText}>When you sell on credit, balances appear here.</Text>
          </View>
        ) : (
          entries.map((e, i) => {
            const balance = Number(e.current_balance || e.currentBalance || 0);
            const fName =
              e.farmer
                ? `${e.farmer.first_name} ${e.farmer.last_name}`
                : e.farmer_name ||
                  e.farmerName ||
                  `Farmer #${e.farmer_id || e.farmerId}`;
            const fId = e.farmer_id || e.farmerId;
            const given = Number(e.total_credit_given || e.totalCreditGiven || 0);
            const received = Number(e.total_payments_received || e.totalPaymentsReceived || 0);
            const lastPay = e.last_payment_date || e.lastPaymentDate;

            return (
              <View key={i} style={[styles.creditCard, balance > 0 && styles.creditCardOwes]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <View> 
                    <Text style={styles.creditName}>
                      {fName}
                    </Text>
                  {e.farmer?.mobile && (
                    <Text style={styles.mobileText}>
                      📞 {e.farmer.mobile}
                    </Text>
                  )}
                  </View>
                  <Text style={[styles.creditBalance, { color: balance > 0 ? "#dc2626" : "#16a34a" }]}>
                    {balance > 0 ? `Owes ${formatRupees(balance)}` : "Cleared ✓"}
                  </Text>
                </View>
                <View style={styles.creditStats}>
                  <Text style={styles.statText}>Given: {formatRupees(given)}</Text>
                  <Text style={styles.statText}>Received: {formatRupees(received)}</Text>
                  {lastPay && <Text style={styles.statText}>Last: {lastPay}</Text>}
                </View>
                {balance > 0 && (
                  <TouchableOpacity
                    style={styles.collectBtn}
                    onPress={() => {
                      setPayFarmerId(fId);
                      setPayFarmerName(fName);
                      setPayAmount(String(balance));
                      setPayModal(true);
                    }}
                  >
                    <Text style={styles.collectBtnText}>💰 Record Payment</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Payment modal */}
      <Modal visible={payModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Record Payment from {payFarmerName}</Text>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Enter amount received"
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#f3f4f6" }]} onPress={() => setPayModal(false)}>
                <Text style={{ color: "#666", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#16a34a" }]} onPress={handlePayment} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginBottom: 8 },

  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 12, borderLeftWidth: 3 },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: "#888" },
  summaryValue: { fontSize: 16, fontWeight: "800", color: "#1a1a1a", marginTop: 4 },

  creditCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  creditCardOwes: { borderLeftWidth: 3, borderLeftColor: "#dc2626" },
  creditName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  creditBalance: { fontSize: 14, fontWeight: "700" },
  creditStats: { flexDirection: "row", gap: 12, marginTop: 4 },
  statText: { fontSize: 11, color: "#888" },
  collectBtn: { marginTop: 8, backgroundColor: "#f0fdf4", borderRadius: 8, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#6ee7b7" },
  collectBtnText: { color: "#16a34a", fontWeight: "700", fontSize: 12 },

  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 8 },
  emptyText: { color: "#999", textAlign: "center", marginTop: 6, fontSize: 13 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#333", textAlign: "center", marginBottom: 12 },
  label: { fontSize: 11, fontWeight: "700", color: "#555", marginTop: 8, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 14, fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  mobileText: {
  fontSize: 12,
  color: "#888",
  marginTop: 2,
},
});
