/**
 * Rate Your Sathi — Uber-style rating experience
 *
 * Full-screen rating with big stars, quick feedback tags,
 * optional text review, and a thank-you animation.
 */
import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator, Animated,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { apiGet, apiPost } from "../lib/api";

const FEEDBACK_TAGS: Record<number, string[]> = {
  5: ["Very helpful", "Always available", "Explained clearly", "Fast response", "Trustworthy"],
  4: ["Helpful", "Good knowledge", "Friendly", "Reliable"],
  3: ["Average", "Could improve", "Slow response", "Hard to reach"],
  2: ["Unhelpful", "Rude", "Doesn't know enough", "Never available"],
  1: ["Very poor", "Did not help at all", "Unprofessional", "Wrong information"],
};

const STAR_LABELS: Record<number, string> = {
  1: "Very poor",
  2: "Poor",
  3: "Average",
  4: "Good",
  5: "Excellent!",
};

const STAR_COLORS: Record<number, string> = {
  1: "#dc2626",
  2: "#ea580c",
  3: "#d97706",
  4: "#65a30d",
  5: "#059669",
};

export default function RateSathiScreen() {
  const router = useRouter();
  const [sathi, setSathi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    apiGet("/choice/my-intermediary")
      .then((r) => {
        if (r.success) setSathi(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const animateStar = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  };

  const handleStarPress = (n: number) => {
    setRating(n);
    setSelectedTags(new Set());
    animateStar();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert("Rate first", "Please tap the stars to rate your Sathi."); return; }

    setSubmitting(true);
    try {
      const r = await apiPost("/choice/rate", {
        rating,
        feedback: [
          ...Array.from(selectedTags),
          review.trim() ? review.trim() : null,
        ].filter(Boolean).join(" | "),
      });
      if (r.success) {
        setSubmitted(true);
      } else {
        Alert.alert("Error", r.message || "Failed to submit rating.");
      }
    } catch {
      Alert.alert("Error", "Could not connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <>
      <Stack.Screen options={{ title: "Rate Your Sathi", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }} />
      <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>
    </>
  );

  if (!sathi) return (
    <>
      <Stack.Screen options={{ title: "Rate Your Sathi", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }} />
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>🤷</Text>
        <Text style={styles.emptyText}>No Sathi selected yet. Select one first.</Text>
        <TouchableOpacity style={styles.goBtn} onPress={() => router.push("/choice")}>
          <Text style={styles.goBtnText}>Find a Sathi</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (submitted) return (
    <>
      <Stack.Screen options={{ title: "Thank You!", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }} />
      <View style={styles.successCenter}>
        <Text style={{ fontSize: 72 }}>🎉</Text>
        <Text style={styles.successTitle}>Thank you!</Text>
        <Text style={styles.successSub}>Your feedback helps {sathi.name || sathi.intermediary?.name} serve farmers better.</Text>
        <View style={styles.successStars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Text key={n} style={{ fontSize: 32 }}>{n <= rating ? "⭐" : "☆"}</Text>
          ))}
        </View>
        {selectedTags.size > 0 && (
          <View style={styles.tagsRow}>
            {Array.from(selectedTags).map((tag) => (
              <View key={tag} style={styles.tagSubmitted}><Text style={styles.tagSubmittedText}>{tag}</Text></View>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.goBtn} onPress={() => router.back()}>
          <Text style={styles.goBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const tags = FEEDBACK_TAGS[rating] || [];
  const starColor = STAR_COLORS[rating] || "#d1d5db";

  return (
    <>
      <Stack.Screen options={{ title: "Rate Your Sathi", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Sathi info */}
        <View style={styles.sathiCard}>
          <View style={styles.avatarBig}>
            <Text style={{ fontSize: 36 }}>🤝</Text>
          </View>
          <Text style={styles.sathiName}>{sathi.name || sathi.intermediary?.name}</Text>
          <Text style={styles.sathiType}>{sathi.type || sathi.intermediary?.type}</Text>
        </View>

        {/* Star rating */}
        <Text style={styles.ratePrompt}>How was your experience?</Text>
        <Animated.View style={[styles.starsRow, { transform: [{ scale: scaleAnim }] }]}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => handleStarPress(n)} activeOpacity={0.6}>
              <Text style={styles.starBig}>{n <= rating ? "⭐" : "☆"}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
        {rating > 0 && (
          <Text style={[styles.rateLabel, { color: starColor }]}>{STAR_LABELS[rating]}</Text>
        )}

        {/* Feedback tags */}
        {rating > 0 && tags.length > 0 && (
          <>
            <Text style={styles.tagPrompt}>What stood out?</Text>
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, selectedTags.has(tag) && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, selectedTags.has(tag) && styles.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Text review */}
        {rating > 0 && (
          <>
            <Text style={styles.tagPrompt}>Want to add more? (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Write a short review..."
              placeholderTextColor="#aaa"
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </>
        )}

        {/* Submit */}
        {rating > 0 && (
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: starColor }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit Rating</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f0fdf4" },
  content: { padding: 20, paddingBottom: 40, alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  sathiCard: { alignItems: "center", marginBottom: 24 },
  avatarBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#ecfdf5", justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, marginBottom: 12 },
  sathiName: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  sathiType: { fontSize: 13, color: "#059669", fontWeight: "600", marginTop: 4 },

  ratePrompt: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 16 },
  starsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  starBig: { fontSize: 44 },
  rateLabel: { fontSize: 16, fontWeight: "700", marginBottom: 20 },

  tagPrompt: { fontSize: 14, fontWeight: "600", color: "#555", marginBottom: 10, alignSelf: "flex-start" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16, width: "100%" },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#d1d5db" },
  tagActive: { backgroundColor: "#059669", borderColor: "#059669" },
  tagText: { fontSize: 13, fontWeight: "600", color: "#555" },
  tagTextActive: { color: "#fff" },

  textArea: { width: "100%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 14, minHeight: 80, marginBottom: 16 },

  submitBtn: { width: "100%", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  emptyText: { color: "#888", textAlign: "center", marginTop: 12, fontSize: 14 },
  goBtn: { marginTop: 16, backgroundColor: "#059669", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  goBtnText: { color: "#fff", fontWeight: "700" },

  // Success
  successCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#ecfdf5" },
  successTitle: { fontSize: 28, fontWeight: "900", color: "#059669", marginTop: 12 },
  successSub: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8, lineHeight: 20 },
  successStars: { flexDirection: "row", gap: 4, marginTop: 16 },
  tagSubmitted: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: "#059669" },
  tagSubmittedText: { color: "#fff", fontSize: 11, fontWeight: "600" },
});
