import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost } from "../lib/api";

// ─── Types ─────────────────────────────────────────────────────────

type Tab = "advisories" | "alerts" | "soil";

interface AdvisoryItem {
  advisoryId: string;
  advisoryType: string;
  content: string;
  urgency: "critical" | "high" | "medium" | "low";
  language: string;
  channel: string;
  deliveredAt: string;
  acknowledged: boolean;
}

interface AlertItem {
  alertId: string;
  alertType: string;
  message: string;
  urgency: "critical" | "high" | "medium" | "low";
  triggeredAt: string;
  actionRecommended: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  weather: "\uD83C\uDF27\uFE0F",
  market: "\uD83D\uDCC8",
  input: "\uD83E\uDDEA",
  pest: "\uD83D\uDC1B",
  loan: "\uD83D\uDCB0",
  harvest: "\uD83C\uDF3E",
  storage: "\uD83D\uDCE6",
};

function typeIcon(type: string): string {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(TYPE_ICONS)) {
    if (key.includes(k)) return v;
  }
  return "\uD83D\uDCCB";
}

function urgencyColor(urgency: string): string {
  if (urgency === "critical") return "#c62828";
  if (urgency === "high") return "#e65100";
  if (urgency === "medium") return "#1565c0";
  return "#2e7d32";
}

function urgencyBg(urgency: string): string {
  if (urgency === "critical") return "#ffebee";
  if (urgency === "high") return "#fff3e0";
  if (urgency === "medium") return "#e3f2fd";
  return "#e8f5e9";
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

// ─── Main Component ────────────────────────────────────────────────

export default function SageAdvisoriesScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("advisories");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [advisories, setAdvisories] = useState<AdvisoryItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalAdvisories, setTotalAdvisories] = useState(0);

  // Track acknowledged + rated per advisory
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // ─── Fetch Data ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [advRes, alertRes] = await Promise.all([
        apiGet("/sage/advisories/me"),
        apiGet("/sage/alerts/me"),
      ]);

      if (advRes.success && advRes.data) {
        setAdvisories(advRes.data.advisories || []);
        setTotalAdvisories(advRes.data.total || 0);
        // Pre-populate acknowledged set
        const ackSet = new Set<string>();
        (advRes.data.advisories || []).forEach((a: AdvisoryItem) => {
          if (a.acknowledged) ackSet.add(a.advisoryId);
        });
        setAcknowledged(ackSet);
      }

      if (alertRes.success && alertRes.data) {
        setAlerts(Array.isArray(alertRes.data) ? alertRes.data : alertRes.data.alerts || []);
      }
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      Alert.alert("Error / त्रुटि", "Could not load advisories. / सलाह लोड नहीं हो सकी।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ─── Acknowledge Advisory ───────────────────────────────────────

  const handleAcknowledge = async (advisoryId: string) => {
    setProcessingIds((prev) => new Set(prev).add(advisoryId));
    try {
      const res = await apiPost("/sage/advisories/me/acknowledge", {
        advisoryId,
        actionTaken: "acknowledged",
        outcome: "noted",
      });
      if (res.success) {
        setAcknowledged((prev) => new Set(prev).add(advisoryId));
      } else {
        Alert.alert("Error", res.message || "Could not acknowledge advisory.");
      }
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(advisoryId);
        return next;
      });
    }
  };

  // ─── Rate Advisory ─────────────────────────────────────────────

  const handleRate = async (advisoryId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [advisoryId]: rating }));
    try {
      await apiPost("/sage/feedback/me", {
        advisoryId,
        rating,
        text: "",
        wasHelpful: rating >= 4,
      });
    } catch {
      // Silent fail on feedback — non-critical
    }
  };

  // ─── Star Rating Component ─────────────────────────────────────

  const StarRating = ({ advisoryId }: { advisoryId: string }) => {
    const current = ratings[advisoryId] || 0;
    return (
      <View style={s.starRow}>
        <Text style={s.rateLabel}>Rate this advice / इस सलाह को रेट करें:</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => handleRate(advisoryId, star)} style={s.starBtn}>
              <Text style={[s.starText, current >= star && s.starActive]}>
                {current >= star ? "\u2605" : "\u2606"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ─── Advisory Card ─────────────────────────────────────────────

  const AdvisoryCard = ({ item }: { item: AdvisoryItem }) => {
    const isAck = acknowledged.has(item.advisoryId);
    const isProcessing = processingIds.has(item.advisoryId);

    return (
      <View style={[s.card, { borderLeftColor: urgencyColor(item.urgency) }]}>
        <View style={s.cardTop}>
          <Text style={s.typeIcon}>{typeIcon(item.advisoryType)}</Text>
          <View style={s.cardTopInfo}>
            <Text style={s.cardType}>{item.advisoryType}</Text>
            <Text style={s.cardDate}>{formatDate(item.deliveredAt)}</Text>
          </View>
          <View style={[s.urgencyBadge, { backgroundColor: urgencyColor(item.urgency) }]}>
            <Text style={s.urgencyText}>{item.urgency.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={s.cardContent}>{item.content}</Text>

        {!isAck ? (
          <TouchableOpacity
            style={[s.ackBtn, isProcessing && s.disabledBtn]}
            onPress={() => handleAcknowledge(item.advisoryId)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.ackBtnText}>Mark as Done / पूरा किया</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View>
            <View style={s.ackDone}>
              <Text style={s.ackDoneText}>{"\u2713"} Acknowledged / स्वीकृत</Text>
            </View>
            <StarRating advisoryId={item.advisoryId} />
          </View>
        )}
      </View>
    );
  };

  // ─── Alert Card ────────────────────────────────────────────────

  const AlertCard = ({ item }: { item: AlertItem }) => (
    <View style={[s.card, { borderLeftColor: urgencyColor(item.urgency), backgroundColor: urgencyBg(item.urgency) }]}>
      <View style={s.cardTop}>
        <Text style={s.typeIcon}>{typeIcon(item.alertType)}</Text>
        <View style={s.cardTopInfo}>
          <Text style={s.cardType}>{item.alertType}</Text>
          <Text style={s.cardDate}>{formatDate(item.triggeredAt)}</Text>
        </View>
        <View style={[s.urgencyBadge, { backgroundColor: urgencyColor(item.urgency) }]}>
          <Text style={s.urgencyText}>{item.urgency.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={s.cardContent}>{item.message}</Text>

      {item.actionRecommended ? (
        <View style={s.actionBox}>
          <Text style={s.actionLabel}>Recommended Action / अनुशंसित कार्रवाई:</Text>
          <Text style={s.actionText}>{item.actionRecommended}</Text>
        </View>
      ) : null}
    </View>
  );

  // ─── Tab Bar ───────────────────────────────────────────────────

  const TabButton = ({ tab, label, labelHi, count }: { tab: Tab; label: string; labelHi: string; count?: number }) => (
    <TouchableOpacity
      style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
        {label}
        {count !== undefined && count > 0 ? ` (${count})` : ""}
      </Text>
      <Text style={[s.tabLabelHi, activeTab === tab && s.tabLabelHiActive]}>{labelHi}</Text>
    </TouchableOpacity>
  );

  // ─── Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1b5e20" />
        <Text style={s.loadingText}>Loading Advisories... / सलाह लोड हो रही है...</Text>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>SAGE Advisories</Text>
        <Text style={s.headerSubtitle}>सेज सलाह</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TabButton tab="advisories" label="Advisories" labelHi="सलाह" count={totalAdvisories} />
        <TabButton tab="alerts" label="Alerts" labelHi="अलर्ट" count={alerts.length} />
        <TabButton tab="soil" label="Soil" labelHi="मृदा" />
      </View>

      {/* Content */}
      <ScrollView
        style={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1b5e20"]} />
        }
      >
        {/* ─── Advisories Tab ────────────────────────────────── */}
        {activeTab === "advisories" && (
          <View>
            {advisories.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyIcon}>{"\uD83C\uDF31"}</Text>
                <Text style={s.emptyTitle}>No advisories yet</Text>
                <Text style={s.emptyText}>
                  Log your farming activities to receive personalized recommendations.
                </Text>
                <Text style={s.emptyTextHi}>
                  व्यक्तिगत सिफारिशें प्राप्त करने के लिए अपनी कृषि गतिविधियां दर्ज करें।
                </Text>
              </View>
            ) : (
              advisories.map((adv) => <AdvisoryCard key={adv.advisoryId} item={adv} />)
            )}
          </View>
        )}

        {/* ─── Alerts Tab ────────────────────────────────────── */}
        {activeTab === "alerts" && (
          <View>
            {alerts.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyIcon}>{"\u2705"}</Text>
                <Text style={s.emptyTitle}>No active alerts</Text>
                <Text style={s.emptyText}>You have no alerts at this time.</Text>
                <Text style={s.emptyTextHi}>इस समय कोई अलर्ट नहीं है।</Text>
              </View>
            ) : (
              alerts.map((al) => <AlertCard key={al.alertId} item={al} />)
            )}
          </View>
        )}

        {/* ─── Soil Health Tab ───────────────────────────────── */}
        {activeTab === "soil" && (
          <TouchableOpacity
            style={s.soilCard}
            onPress={() => router.push("/soil-health" as any)}
          >
            <Text style={s.soilIcon}>{"\uD83E\uDDEA"}</Text>
            <View style={s.soilInfo}>
              <Text style={s.soilTitle}>Soil Health Card / मृदा स्वास्थ्य कार्ड</Text>
              <Text style={s.soilDesc}>
                View your soil test results and get personalized recommendations
              </Text>
              <Text style={s.soilDescHi}>
                अपने मृदा परीक्षण परिणाम देखें और व्यक्तिगत सिफारिशें पाएं
              </Text>
            </View>
            <Text style={s.soilArrow}>{"\u203A"}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f8e9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f8e9" },
  loadingText: { marginTop: 12, color: "#555", fontSize: 14, textAlign: "center" },

  // Header
  header: { backgroundColor: "#1b5e20", paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  backBtn: { marginBottom: 8 },
  backText: { color: "#fff", fontSize: 16 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#c8e6c9", fontSize: 16, marginTop: 2 },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: "#1b5e20" },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#888" },
  tabLabelActive: { color: "#1b5e20" },
  tabLabelHi: { fontSize: 11, color: "#bbb", marginTop: 1 },
  tabLabelHiActive: { color: "#4caf50" },

  // Content
  content: { flex: 1 },

  // Card
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#1b5e20",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  typeIcon: { fontSize: 24, marginRight: 10 },
  cardTopInfo: { flex: 1 },
  cardType: { fontSize: 14, fontWeight: "700", color: "#333", textTransform: "capitalize" },
  cardDate: { fontSize: 12, color: "#999", marginTop: 1 },
  cardContent: { fontSize: 14, color: "#444", lineHeight: 20, marginBottom: 10 },

  // Urgency Badge
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  urgencyText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // Acknowledge Button
  ackBtn: {
    backgroundColor: "#1b5e20",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  ackBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  disabledBtn: { opacity: 0.6 },
  ackDone: {
    backgroundColor: "#e8f5e9",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  ackDoneText: { color: "#2e7d32", fontSize: 14, fontWeight: "600" },

  // Star Rating
  starRow: { marginTop: 10 },
  rateLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
  stars: { flexDirection: "row" },
  starBtn: { paddingHorizontal: 4 },
  starText: { fontSize: 24, color: "#ccc" },
  starActive: { color: "#ffa000" },

  // Action Box (alerts)
  actionBox: {
    backgroundColor: "#fff8e1",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#e65100", marginBottom: 4 },
  actionText: { fontSize: 13, color: "#555", lineHeight: 18 },

  // Empty State
  emptyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 40,
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  emptyTextHi: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 20, marginTop: 6 },

  // Soil Health Quick Link
  soilCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  soilIcon: { fontSize: 40, marginRight: 14 },
  soilInfo: { flex: 1 },
  soilTitle: { fontSize: 16, fontWeight: "700", color: "#1b5e20", marginBottom: 4 },
  soilDesc: { fontSize: 13, color: "#555", lineHeight: 18 },
  soilDescHi: { fontSize: 12, color: "#999", lineHeight: 18, marginTop: 4 },
  soilArrow: { fontSize: 30, color: "#1b5e20", fontWeight: "300" },
});
