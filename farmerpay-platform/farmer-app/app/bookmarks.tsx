/**
 * Bookmarks screen — lists loan products the farmer has bookmarked.
 *
 * Fixes a silent UX dead-end: the loan-apply screen has a 🔖 button that
 * POSTs /dice/products/:id/bookmark, but until now there was no screen
 * that listed bookmarks back to the farmer. Every bookmark click was
 * silently swallowed. This screen reads GET /dice/bookmarked-products
 * and lets the farmer re-open any saved product in loan-apply with the
 * product pre-selected via the ?productId=… param.
 *
 * Tier-1 auth only (no Aadhaar step-up required — a bookmark is not
 * PII-regulated). Reuses the list-card styling from (tabs)/loans.tsx
 * so the visual language stays consistent across loan screens.
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
import { apiGet } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────

interface Bookmark {
  productId: number;
  productName: string | null;
  provider: string | null;
  bookmarkNotes: string | null;
  bookmarkedAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

const formatDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Component ────────────────────────────────────────────────────

export default function BookmarksScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await apiGet("/dice/bookmarked-products");
      // Endpoint returns { data: [...] } — tolerate both shapes in case
      // the backend wraps it differently under success.
      const list: Bookmark[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
      setBookmarks(list);
    } catch {
      setBookmarks([]);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {bookmarks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🔖</Text>
          <Text style={styles.emptyTitle}>No bookmarks yet</Text>
          <Text style={styles.emptySub}>
            Tap the 🔖 icon on any loan product to save it here for later.
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => router.push("/loan-apply" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyCtaText}>Browse loan products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.countHeader}>
            {bookmarks.length} saved product{bookmarks.length === 1 ? "" : "s"}
          </Text>
          {bookmarks.map((b) => (
            <TouchableOpacity
              key={b.productId}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/loan-apply" as any,
                  params: { productId: String(b.productId) },
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>🔖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {b.productName || "Loan product"}
                  </Text>
                  <Text style={styles.cardProvider} numberOfLines={1}>
                    {b.provider || "—"} · saved {formatDate(b.bookmarkedAt)}
                  </Text>
                </View>
                <Text style={styles.cardArrow}>→</Text>
              </View>
              {b.bookmarkNotes ? (
                <Text style={styles.cardNotes} numberOfLines={2}>
                  "{b.bookmarkNotes}"
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  countHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#7c5800",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardEmoji: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20" },
  cardProvider: { fontSize: 11, color: "#888", marginTop: 2, fontWeight: "600" },
  cardArrow: { fontSize: 18, color: "#999", marginLeft: 4 },
  cardNotes: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
    fontStyle: "italic",
    lineHeight: 17,
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#333" },
  emptySub: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyCta: {
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  emptyCtaText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
