/**
 * Loans Tab
 *
 * Lists every loan application the farmer has filed (any status), pulled
 * from /dice/applications via the step-up-aware client. Tapping a row opens
 * a detail screen with the LOS status timeline.
 *
 * Empty state pushes the farmer into /loan-apply.
 *
 * Tier-2: this tab requires an active Aadhaar step-up session because
 * loan data is regulated as PII under the bank's data-sharing agreement.
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { apiDiceGet, StepUpRequiredError, formatRupees } from "../../lib/api";
import {
  isAadhaarVerified,
  getAadhaarLast4,
  getAadhaarTimeLeftSeconds,
  formatTimeLeft,
} from "../../lib/aadhaarAuth";

interface LoanApplication {
  applicationId: number;
  applicationUuid: string;
  productName?: string;
  providerName?: string;
  loanAmount?: string | number;
  approvalAmount?: string | number | null;
  tenureMonths?: number;
  status?: string;
  appliedAt?: string;
  intendedUse?: string;
  approvalInterestRate?: string | number | null;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#eee", fg: "#666" },
  submitted: { bg: "#fff3e0", fg: "#e65100" },
  under_review: { bg: "#fff3e0", fg: "#e65100" },
  approved: { bg: "#e3f2fd", fg: "#1565c0" },
  disbursed: { bg: "#e8f5e9", fg: "#2e7d32" },
  active: { bg: "#e8f5e9", fg: "#2e7d32" },
  closed: { bg: "#eee", fg: "#666" },
  rejected: { bg: "#fbe9e7", fg: "#c62828" },
};

const statusStyle = (s: string | undefined) => {
  const k = (s || "").toLowerCase().replace(/[\s-]/g, "_");
  return STATUS_COLORS[k] || { bg: "#eee", fg: "#666" };
};

const num = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
};

const formatDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function LoansScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [stepUpOk, setStepUpOk] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const loadLoans = useCallback(async () => {
    try {
      const res = await apiDiceGet("/dice/applications");
      const list = Array.isArray(res?.data) ? res.data : [];
      setLoans(list);
    } catch (e: any) {
      if (e instanceof StepUpRequiredError) {
        router.replace("/aadhaar-verify?returnTo=/(tabs)/loans" as any);
      }
    }
  }, []);

  // Tier-2 gate + initial load
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const verified = await isAadhaarVerified();
        if (!verified) {
          router.replace("/aadhaar-verify?returnTo=/(tabs)/loans" as any);
          return;
        }
        setStepUpOk(true);
        setLast4(await getAadhaarLast4());
        setTimeLeft(await getAadhaarTimeLeftSeconds());
        await loadLoans();
        setLoading(false);
      })();
    }, [loadLoans])
  );

  // Step-up countdown
  useEffect(() => {
    if (!stepUpOk) return;
    const iv = setInterval(async () => {
      const t = await getAadhaarTimeLeftSeconds();
      setTimeLeft(t);
      if (t <= 0) router.replace("/aadhaar-verify?returnTo=/(tabs)/loans" as any);
    }, 1000);
    return () => clearInterval(iv);
  }, [stepUpOk]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLoans();
    setRefreshing(false);
  };

  if (loading || !stepUpOk) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e65100" />
      </View>
    );
  }

  // ── Aggregate stats ──
  const activeCount = loans.filter((l) =>
    ["disbursed", "active", "approved"].includes((l.status || "").toLowerCase()),
  ).length;
  const pendingCount = loans.filter((l) =>
    ["submitted", "under_review", "draft"].includes((l.status || "").toLowerCase()),
  ).length;
  const totalDisbursed = loans
    .filter((l) => ["disbursed", "active"].includes((l.status || "").toLowerCase()))
    .reduce((s, l) => s + num(l.approvalAmount ?? l.loanAmount), 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Step-Up Status Banner */}
      <View style={styles.stepUpBanner}>
        <Text style={styles.stepUpIcon}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepUpLabel}>DICE SECURE SESSION</Text>
          <Text style={styles.stepUpDetail}>
            Aadhaar XXXX-XXXX-{last4} verified · expires in {formatTimeLeft(timeLeft)}
          </Text>
        </View>
      </View>

      {/* Apply CTA */}
      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => router.push("/loan-apply" as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.applyBtnText}>+ Apply for New Loan / नया ऋण आवेदन</Text>
      </TouchableOpacity>

      {/* Bookmarks CTA — lights up farmer_loan_bookmarks which used to be
          a write-only black hole (bookmark button wrote, no screen read). */}
      <TouchableOpacity
        style={styles.bookmarksBtn}
        onPress={() => router.push("/bookmarks" as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.bookmarksBtnText}>🔖 My saved products / सहेजे गए</Text>
      </TouchableOpacity>

      {/* Repayments CTA */}
      <TouchableOpacity
        style={styles.repayBtn}
        onPress={() => router.push("/repayments" as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.repayBtnText}>💰 Repayments / किस्तें भुगतान</Text>
      </TouchableOpacity>

      {/* Aggregate stats */}
      {loans.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statValue}>{activeCount}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: "#e65100" }]}>{pendingCount}</Text>
          </View>
          <View style={[styles.statCell, { flex: 1.4 }]}>
            <Text style={styles.statLabel}>Disbursed</Text>
            <Text style={styles.statValue}>{formatRupees(totalDisbursed)}</Text>
          </View>
        </View>
      )}

      {/* Empty state */}
      {loans.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏦</Text>
          <Text style={styles.emptyTitle}>No loans yet</Text>
          <Text style={styles.emptySub}>
            Tap "Apply for New Loan" above to start your first application.
          </Text>
        </View>
      )}

      {/* Loan list */}
      {loans.map((l) => {
        const status = l.status || "draft";
        const sty = statusStyle(status);
        const amount = num(l.approvalAmount ?? l.loanAmount);
        const isActive = ["disbursed", "active"].includes(status.toLowerCase());

        return (
          <TouchableOpacity
            key={l.applicationUuid || l.applicationId}
            style={[styles.loanCard, isActive && styles.loanCardActive]}
            onPress={() =>
              router.push({
                pathname: "/loan-apply" as any,
                params: { initialApplicationId: String(l.applicationId) },
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.loanHeader}>
              <Text style={styles.loanIcon}>{isActive ? "🏦" : "📄"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.loanTitle, isActive && { color: "#fff" }]}>
                  {l.productName || "Loan application"}
                </Text>
                <Text style={[styles.loanProvider, isActive && { color: "#a5d6a7" }]}>
                  {l.providerName || "—"} · {formatDate(l.appliedAt)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: sty.bg }]}>
                <Text style={[styles.statusText, { color: sty.fg }]}>
                  {status.replace(/_/g, " ").toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.loanRow}>
              <View>
                <Text style={[styles.amountLabel, isActive && { color: "#a5d6a7" }]}>
                  Amount / राशि
                </Text>
                <Text style={[styles.amountValue, isActive && { color: "#fff" }]}>
                  {formatRupees(amount)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.amountLabel, isActive && { color: "#a5d6a7" }]}>
                  Tenure / अवधि
                </Text>
                <Text style={[styles.tenureValue, isActive && { color: "#fff" }]}>
                  {l.tenureMonths || 12} months
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  stepUpBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff3e0", borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#ffb74d",
  },
  stepUpIcon: { fontSize: 22 },
  stepUpLabel: { fontSize: 10, fontWeight: "900", color: "#e65100", letterSpacing: 1 },
  stepUpDetail: { fontSize: 11, color: "#6d4c41", marginTop: 2 },

  applyBtn: {
    backgroundColor: "#2e7d32", borderRadius: 14, padding: 16,
    alignItems: "center", marginBottom: 12,
  },
  applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  repayBtn: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    alignItems: "center", marginBottom: 12,
    borderWidth: 2, borderColor: "#1b5e20",
  },
  repayBtnText: { color: "#1b5e20", fontSize: 15, fontWeight: "800" },

  // Secondary CTA — visually lighter than the primary apply/repay buttons
  // because bookmarks are a lower-frequency, lower-stakes destination.
  bookmarksBtn: {
    backgroundColor: "#fff8e1", borderRadius: 14, padding: 12,
    alignItems: "center", marginBottom: 12,
    borderWidth: 1, borderColor: "#ffcc80",
  },
  bookmarksBtnText: { color: "#7c5800", fontSize: 13, fontWeight: "700" },

  statsRow: {
    flexDirection: "row", gap: 8, marginBottom: 12,
  },
  statCell: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12,
  },
  statLabel: { fontSize: 10, color: "#888", fontWeight: "700", textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: "900", color: "#1b5e20", marginTop: 4 },

  emptyCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 28, alignItems: "center",
    marginTop: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#333" },
  emptySub: { fontSize: 13, color: "#777", textAlign: "center", marginTop: 6, lineHeight: 18 },

  loanCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
  },
  loanCardActive: {
    backgroundColor: "#1b5e20",
  },
  loanHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12,
  },
  loanIcon: { fontSize: 22 },
  loanTitle: { fontSize: 14, fontWeight: "800", color: "#333" },
  loanProvider: { fontSize: 11, color: "#888", marginTop: 2, fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  statusText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },

  loanRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  amountLabel: { fontSize: 11, color: "#888", fontWeight: "600" },
  amountValue: { fontSize: 22, fontWeight: "900", color: "#1b5e20", marginTop: 2 },
  tenureValue: { fontSize: 14, fontWeight: "800", color: "#333", marginTop: 2 },
});
