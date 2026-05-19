/**
 * Money Tab — Persona phase consolidated money center.
 *
 * Replaces the old DICE/Loans tab. Shows:
 *   - Income summary (pulled from persona response)
 *   - Active loans with EMI schedule
 *   - Insurance policies
 *
 * All data comes from endpoints that already exist (DICE, persona). The
 * deep per-loan screens (loan-apply, repayments, insurance detail) are
 * reachable from here.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { apiGet, formatRupees } from "../../lib/api";

interface LoanSummary {
  applicationId: number;
  principalAmount: number;
  outstandingAmount: number;
  status: string;
  productCode?: string;
  productName?: string;
  providerName?: string | null;
  bankName?: string | null;
  schemeName?: string | null;
  source?: "farmerpay" | "bank";
  disbursedAt?: string | null;
  nextEmi?: { scheduleNumber: number; dueDate: string; dueAmount: number; status: string } | null;
  daysPastDue?: number;
  district?: string | null;
}

export default function MoneyTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [persona, setPersona] = useState<any>(null);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [nextEmi, setNextEmi] = useState<any>(null);
  const [borrowingSummary, setBorrowingSummary] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [personaRes, loansRes, emiRes, borrowingRes] = await Promise.all([
        apiGet("/farmer/my-activities-v2").catch(() => null),
        apiGet("/dice/loans/me").catch(() => null),
        apiGet("/sage/feed/me").catch(() => null),
        apiGet("/farmer/borrowing-summary").catch(() => null),
      ]);
      if (personaRes?.data) setPersona(personaRes.data);
      setLoans(loansRes?.data?.loans || loansRes?.data?.items || []);
      // Prefer the unified nextEmi from the loans feed (covers bank-imported
      // loans). Fall back to the SAGE feed's loan-repayment nextEmi if the
      // loans endpoint doesn't surface one (e.g. if the only loans are
      // fully paid or have no schedule yet).
      if (loansRes?.data?.nextEmi) {
        setNextEmi(loansRes.data.nextEmi);
      } else if (emiRes?.data?.nextEmi) {
        setNextEmi(emiRes.data.nextEmi);
      }
      if (borrowingRes?.data?.summary) setBorrowingSummary(borrowingRes.data.summary);
    } catch {
      /* tolerate partial failures */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  const totalAnnual = persona?.totalAnnualIncome || 0;
  const totalOutstanding = loans.reduce((s, l) => s + (l.outstandingAmount || 0), 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Income section */}
      <Text style={styles.sectionHeader}>💰 Income</Text>
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Annual income</Text>
          <Text style={styles.summaryValue}>{formatRupees(totalAnnual)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Monthly average</Text>
          <Text style={styles.summaryValue}>{formatRupees(Math.round(totalAnnual / 12))}</Text>
        </View>
      </View>

      {persona?.streams?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Breakdown</Text>
          {persona.streams.map((s: any, idx: number) => (
            <View key={idx} style={styles.streamRow}>
              <Text style={styles.streamLabel}>{s.type}</Text>
              <Text style={styles.streamValue}>{formatRupees(s.annualIncome)}/yr</Text>
            </View>
          ))}
        </View>
      )}

      {/* Borrowing sources section */}
      <Text style={styles.sectionHeader}>💰 My Borrowing Sources</Text>
      <TouchableOpacity
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#7c5800" }]}
        onPress={() => router.push("/borrowing-sources" as any)}
        activeOpacity={0.85}
      >
        {borrowingSummary && borrowingSummary.total.count > 0 ? (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Formal ({borrowingSummary.formal.count})</Text>
              <Text style={[styles.summaryValue, { color: "#2e7d32" }]}>
                {formatRupees(borrowingSummary.formal.totalOutstanding)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Informal ({borrowingSummary.informal.count})</Text>
              <Text style={[styles.summaryValue, { color: "#e65100" }]}>
                {formatRupees(borrowingSummary.informal.totalOutstanding)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: "800" }]}>Total</Text>
              <Text style={[styles.summaryValue, { color: "#c62828" }]}>
                {formatRupees(borrowingSummary.total.totalOutstanding)}
              </Text>
            </View>
            <Text style={[styles.emptyText, { marginTop: 6, marginBottom: 0 }]}>Manage sources →</Text>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Track all your borrowings</Text>
            <Text style={styles.summaryLabel}>Add bank loans, PACS, informal debt</Text>
            <Text style={[styles.emptyText, { marginTop: 6, marginBottom: 0 }]}>Add sources →</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Loans section */}
      <Text style={styles.sectionHeader}>🏦 Loans</Text>
      {loans.length === 0 ? (
        <View style={[styles.card, { alignItems: "center", padding: 20 }]}>
          <Text style={styles.emptyText}>No active loans</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push("/loan-apply" as any)}
          >
            <Text style={styles.ctaBtnText}>Apply for a loan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total outstanding</Text>
              <Text style={[styles.summaryValue, { color: "#c62828" }]}>
                {formatRupees(totalOutstanding)}
              </Text>
            </View>
            {nextEmi && (
              <>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Next EMI</Text>
                  <Text style={[styles.summaryValue, { color: "#7c5800" }]}>
                    {formatRupees(nextEmi.dueAmount)} · {nextEmi.dueDate}
                  </Text>
                </View>
              </>
            )}
          </View>
          {loans.map((loan) => {
            const isBank = loan.source === "bank";
            // Build a readable title: scheme name is best, then product name, then product code, then generic
            const title = loan.schemeName || loan.productName || loan.productCode || "Loan";
            // Route key — use loanUuid-style approach via applicationId (both sources
            // populate this field so the repayments screen treats them uniformly)
            // Route discriminator: bank-imported loans get their own
            // detail screen that shows sanction / rate / SMA / gold
            // collateral / recent activity timeline. FarmerPay-origin
            // loans still go to the shared repayments screen.
            const detailRoute = isBank
              ? `/bank-loan-detail?id=${loan.applicationId}`
              : `/repayments?applicationId=${loan.applicationId}&source=${loan.source || "farmerpay"}`;
            return (
              <TouchableOpacity
                key={`${loan.source || "fp"}-${loan.applicationId}`}
                style={[
                  styles.card,
                  isBank && { borderLeftWidth: 4, borderLeftColor: "#1565c0" },
                ]}
                onPress={() => router.push(detailRoute as any)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  {isBank && <Text style={styles.bankBadge}>🏦 bank-linked</Text>}
                </View>
                {loan.bankName && (
                  <Text style={styles.summaryLabel}>
                    {loan.bankName}
                    {loan.district ? ` · ${loan.district}` : ""}
                  </Text>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Principal</Text>
                  <Text style={styles.summaryValue}>{formatRupees(loan.principalAmount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Outstanding</Text>
                  <Text style={styles.summaryValue}>{formatRupees(loan.outstandingAmount)}</Text>
                </View>
                {loan.nextEmi && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Next EMI</Text>
                    <Text style={[styles.summaryValue, { color: "#7c5800" }]}>
                      {formatRupees(loan.nextEmi.dueAmount)} · {loan.nextEmi.dueDate}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.statusBadge,
                    loan.status === "npa" && { backgroundColor: "#fbe9e7", color: "#c62828" },
                    loan.status === "sma_2" && { backgroundColor: "#fff3e0", color: "#e65100" },
                  ]}
                >
                  {loan.status}
                  {loan.daysPastDue ? ` · ${loan.daysPastDue}d overdue` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Insurance section */}
      <Text style={styles.sectionHeader}>🛡️ Insurance</Text>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/insurance" as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.cardTitle}>Insurance policies</Text>
        <Text style={styles.summaryLabel}>Tap to view and apply</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 8, marginLeft: 4, marginTop: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#1b5e20", marginBottom: 6 },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: "#555" },
  summaryValue: { fontSize: 14, fontWeight: "800", color: "#222" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 },

  streamRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  streamLabel: { fontSize: 13, color: "#444", textTransform: "capitalize" },
  streamValue: { fontSize: 13, fontWeight: "700", color: "#1b5e20" },

  emptyText: { fontSize: 13, color: "#888", marginBottom: 12 },
  ctaBtn: { backgroundColor: "#2e7d32", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  ctaBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  statusBadge: {
    alignSelf: "flex-start", backgroundColor: "#e8f5e9", color: "#2e7d32",
    fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6,
  },
  bankBadge: {
    fontSize: 10, fontWeight: "800", color: "#1565c0",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
});
