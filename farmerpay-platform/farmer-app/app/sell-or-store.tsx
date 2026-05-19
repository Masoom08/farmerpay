/**
 * Sell-or-Store Wizard — PULSE Phase 1 farmer-facing screen.
 *
 * Wraps the existing-but-invisible /pulse/sell-store-advisor decision
 * engine in a 5-step wizard that auto-populates everything from the
 * farmer's existing ROOTS crop cycles + DICE loans, then renders a
 * clear "SELL NOW / STORE FOR X DAYS" recommendation with a scenario
 * simulator.
 *
 * Backend pieces (all already exist):
 *   GET  /pulse/sell-store-defaults-enriched/me?cycleId=&commodityId=
 *        → cycle, costOfCultivation, quantityQuintals, nextEmi, prices
 *   POST /pulse/sell-store-advisor → 5 scenarios + recommendation
 *   POST /pulse/sell-store-recommendations → persists choice to
 *        pulse_sell_recommendations
 *
 * Tier-1 auth (no Aadhaar step-up — this is read-mostly with a single
 * persistence write). All API calls go through apiGet / apiPost which
 * already attach the JWT.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { apiGet, apiPost, formatRupees } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface CycleSummary {
  cycleId: number;
  cycleUuid: string;
  cropId: string;
  varietyId: string | null;
  season: string;
  year: number;
  sowingDate: string | null;
  expectedHarvestDate: string | null;
  actualHarvestDate: string | null;
  status: string;
  selfDeclaredCrop: string | null;
}

interface NextEmi {
  scheduleNumber: number;
  dueDate: string;
  dueAmount: number;
  daysToEmi: number;
  status: string;
}

interface EnrichedDefaults {
  openMarketPrice: number;
  mspPrice: number;
  priceChange21d: number;
  priceChange45d: number;
  priceChange60d: number;
  preSowingAmount: number;
  preSowingRate: number;
  preSowingElapsedDays: number;
  warehouse: any;
  cycle: CycleSummary | null;
  costOfCultivation: number | null;
  costPerHectare: number | null;
  quantityQuintals: number | null;
  harvestDate: string | null;
  nextEmi: NextEmi | null;
  activeLoanApplicationId: number | null;
}

interface ScenarioCard {
  name: string;
  days: number;
  salePrice: number;
  mandiFees: number;
  holdingCost: { total: number };
  netPerQtl: number;
  netTotal: number;
  totalRepay: number;
  afterLoans: number;
}

interface AdvisorResponse {
  inputs: any;
  wrLoanPrincipal: number;
  scenarios: { now: ScenarioCard; msp: ScenarioCard; d21: ScenarioCard; d45: ScenarioCard; d60: ScenarioCard };
  recommendation: {
    bestOption: string;
    bestNetPerQtl: number;
    bestNetTotal: number;
    bestAfterLoans: number;
    isNegativeAfterLoans: boolean;
    breakevenPrice45d: number;
    holdingCost45dPerQtl: number;
    rationale: string;
  };
}

// Default commodity → uuid map (the 5 seeded commodities). The
// enriched-defaults endpoint will tell us which one matches the cycle
// crop_id; this map is just a fallback when the lookup fails.
const COMMODITY_BY_CROP_ID: Record<string, string> = {
  "85395b3c-cc44-44df-a8b4-e9263b66d7fc": "COMM-WHEAT-UUID-001", // Wheat
  "5da0ab68-40ee-42b4-a55c-34490fdd714f": "COMM-RICE-UUID-002",  // Rice
};

// ─── Component ────────────────────────────────────────────────────

export default function SellOrStoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cycleId?: string }>();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Defaults from backend (Step 1 fills these)
  const [defaults, setDefaults] = useState<EnrichedDefaults | null>(null);

  // Mandi context (Step 2)
  const [pickedMandi, setPickedMandi] = useState<{ id: number; name: string } | null>(null);

  // Editable cost rows (Step 3) — all start from defaults but the
  // farmer can override any of them
  const [costOfCultivation, setCostOfCultivation] = useState<string>("");
  const [transportPerQtl, setTransportPerQtl] = useState<string>("25");
  const [mandiFeePercent, setMandiFeePercent] = useState<string>("1.5");
  const [storageCostPerDay, setStorageCostPerDay] = useState<string>("1.8");

  // Calculator result (Step 4)
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Scenario simulator (Step 5) — overrides for re-running
  const [simPrice, setSimPrice] = useState<string>("");
  const [simDays, setSimDays] = useState<string>("21");

  // Step 6 — saved
  const [savedRecommendationId, setSavedRecommendationId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Phase 2 — "How did it go?" feedback card for a previously-saved
  // recommendation on this cycle that hasn't been graded yet
  const [existingRec, setExistingRec] = useState<{
    recommendationId: number;
    recommendedTiming: string | null;
    generatedDate: string | null;
  } | null>(null);
  const [feedbackFollowed, setFeedbackFollowed] = useState<"yes" | "no" | "partly" | null>(null);
  const [feedbackPrice, setFeedbackPrice] = useState<string>("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  // ── Step 1: load defaults on focus ──
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const cycleId = params.cycleId || "";
          // Pre-pick wheat as the demo commodity if we don't yet know the cycle
          const initialCommodity = "COMM-WHEAT-UUID-001";
          const qs = new URLSearchParams();
          if (cycleId) qs.set("cycleId", cycleId);
          qs.set("commodityId", initialCommodity);
          const r = await apiGet(`/pulse/sell-store-defaults-enriched/me?${qs.toString()}`);
          const d: EnrichedDefaults = r?.data || r;
          setDefaults(d);
          if (d?.costOfCultivation) setCostOfCultivation(String(d.costOfCultivation));
          if (d?.openMarketPrice) setSimPrice(String(d.openMarketPrice));

          // Phase 2 — check for an existing recommendation on this cycle
          // that the farmer hasn't yet given feedback on. If found, the
          // "How did it go?" card renders at the top of Step 1.
          try {
            const cycleKey = d?.cycle?.cycleUuid || cycleId || "";
            const recQs = cycleKey ? `?cycleId=${encodeURIComponent(cycleKey)}` : "";
            const recR = await apiGet(`/pulse/sell-recommendations/me${recQs}`);
            const recList = (recR?.data || recR || []) as Array<any>;
            const ungraded = recList.find((x: any) => x && x.followed == null);
            if (ungraded) {
              setExistingRec({
                recommendationId: ungraded.recommendationId,
                recommendedTiming: ungraded.recommendedTiming,
                generatedDate: ungraded.generatedDate,
              });
            }
          } catch {
            // non-fatal — feedback card just won't render
          }
        } catch (e: any) {
          setError(e?.message || "Couldn't load your harvest data");
        } finally {
          setLoading(false);
        }
      })();
    }, [params.cycleId]),
  );

  // ── Helper: call the advisor with the current inputs ──
  const runAdvisor = async (overrides: Partial<{ openMarketPrice: number; days: number; quantityQuintals: number }> = {}) => {
    if (!defaults) return;
    setCalculating(true);
    try {
      const cropName = defaults.cycle?.selfDeclaredCrop || "Wheat";
      const qty = overrides.quantityQuintals ?? defaults.quantityQuintals ?? 1;
      const openPrice = overrides.openMarketPrice ?? defaults.openMarketPrice;

      const payload = {
        farmerId: undefined, // backend resolves from JWT
        crop: cropName,
        quantityQuintals: qty,
        openMarketPrice: openPrice,
        mspPrice: defaults.mspPrice,
        priceChange21d: defaults.priceChange21d,
        priceChange45d: defaults.priceChange45d,
        priceChange60d: defaults.priceChange60d,
        warehouseType: "wdra" as const,
        storageCostPerQtlPerDay: num(storageCostPerDay) || 1.8,
        transportPerQtl: num(transportPerQtl) || 25,
        annualInterestRate: defaults.preSowingRate || 12,
        insuranceRate: 0.15,
        wastageRate: 0.25,
        mandiFeePercent: num(mandiFeePercent) || 1.5,
        usePreSowing: (defaults.preSowingAmount || 0) > 0,
        preSowingAmount: defaults.preSowingAmount || 0,
        preSowingRate: defaults.preSowingRate || 12,
        preSowingProcFee: 0,
        preSowingElapsedDays: defaults.preSowingElapsedDays || 0,
        useWrLoan: false, // Phase 1 hides WR loan complexity from the farmer
        wrLtvPercent: 70,
        wrRate: 10.5,
        wrProcFee: 0.5,
        wrValuationBasis: "open" as const,
        // Phase 1 cost-of-cultivation isn't a calculator input directly
        // but we attach it to the payload so saveRecommendation has it
        costOfCultivation: num(costOfCultivation) || defaults.costOfCultivation || 0,
      };
      const r = await apiPost("/pulse/sell-store-advisor", payload);
      const data: AdvisorResponse = r?.data || r;
      setAdvisor(data);
    } catch (e: any) {
      Alert.alert("Calculation failed", e?.message || "Try again in a moment");
    } finally {
      setCalculating(false);
    }
  };

  // ── Auto-run the advisor when we land on Step 4 ──
  useEffect(() => {
    if (step === 4 && !advisor && defaults) {
      runAdvisor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, defaults]);

  // ── Save the chosen recommendation ──
  const saveDecision = async (chosenLabel: string) => {
    if (!defaults || !advisor) return;
    setSaving(true);
    try {
      const r = await apiPost("/pulse/sell-store-recommendations", {
        cycleUuid: defaults.cycle?.cycleUuid || null,
        commodityId: COMMODITY_BY_CROP_ID[defaults.cycle?.cropId || ""] || "COMM-WHEAT-UUID-001",
        scenarios: advisor.scenarios,
        recommendation: { ...advisor.recommendation, bestOption: chosenLabel },
        linkedLoanApplicationId: defaults.activeLoanApplicationId,
        loanOutstandingAtRecommendation: defaults.preSowingAmount || null,
      });
      const id = r?.data?.recommendationId || null;
      setSavedRecommendationId(id);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Try again");
    } finally {
      setSaving(false);
    }
  };

  // ── Submit "How did it go?" feedback ──
  const submitFeedback = async () => {
    if (!existingRec || !feedbackFollowed) return;
    setFeedbackSaving(true);
    try {
      const followedBool =
        feedbackFollowed === "yes" ? true : feedbackFollowed === "no" ? false : null;
      await apiPost(
        `/pulse/sell-recommendations/${existingRec.recommendationId}/feedback`,
        {
          followed: followedBool,
          actualPriceAchieved: feedbackPrice ? num(feedbackPrice) : undefined,
          actualSaleDate: new Date().toISOString().slice(0, 10),
        },
      );
      setFeedbackDone(true);
    } catch (e: any) {
      Alert.alert("Couldn't save feedback", e?.message || "Try again");
    } finally {
      setFeedbackSaving(false);
    }
  };

  // ── Render: feedback card for a stale recommendation ──
  const renderFeedbackCard = () => {
    if (!existingRec || feedbackDone) return null;
    return (
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>📋 How did it go?</Text>
        <Text style={styles.feedbackSub}>
          On {formatDate(existingRec.generatedDate)} we recommended:{" "}
          <Text style={{ fontWeight: "800" }}>
            {existingRec.recommendedTiming || "—"}
          </Text>
        </Text>
        <Text style={styles.feedbackQ}>Did you follow this?</Text>
        <View style={styles.feedbackBtnRow}>
          {(["yes", "no", "partly"] as const).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.feedbackBtn,
                feedbackFollowed === opt && styles.feedbackBtnActive,
              ]}
              onPress={() => setFeedbackFollowed(opt)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.feedbackBtnText,
                  feedbackFollowed === opt && styles.feedbackBtnTextActive,
                ]}
              >
                {opt === "yes" ? "Yes" : opt === "no" ? "No" : "Partly"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.feedbackQ}>What price did you actually get? (optional)</Text>
        <TextInput
          style={styles.feedbackInput}
          keyboardType="numeric"
          value={feedbackPrice}
          onChangeText={setFeedbackPrice}
          placeholder="₹/qtl"
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity
          style={[
            styles.feedbackSubmit,
            (!feedbackFollowed || feedbackSaving) && styles.feedbackSubmitDisabled,
          ]}
          onPress={submitFeedback}
          disabled={!feedbackFollowed || feedbackSaving}
          activeOpacity={0.85}
        >
          <Text style={styles.feedbackSubmitText}>
            {feedbackSaving ? "Saving..." : "Save feedback"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render: stepper ──
  const renderStepper = () => (
    <View style={styles.stepper}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={[styles.stepDot, step >= (n as Step) ? styles.stepDotActive : styles.stepDotInactive]}
        >
          <Text
            style={[
              styles.stepDotText,
              step >= (n as Step) ? styles.stepDotTextActive : styles.stepDotTextInactive,
            ]}
          >
            {n}
          </Text>
        </View>
      ))}
    </View>
  );

  // ── Render: loading / error ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5800" />
        <Text style={styles.loadingText}>Loading your harvest data...</Text>
      </View>
    );
  }

  if (error || !defaults) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>📊</Text>
        <Text style={styles.errorTitle}>Couldn't load your data</Text>
        <Text style={styles.errorSub}>{error || "Try again in a moment"}</Text>
        <TouchableOpacity
          style={styles.errorBtn}
          onPress={() => router.replace("/(tabs)" as any)}
        >
          <Text style={styles.errorBtnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── No harvest cycle found — empty state ──
  if (!defaults.cycle) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>🌾</Text>
        <Text style={styles.errorTitle}>No harvested crop yet</Text>
        <Text style={styles.errorSub}>
          You don't have any cycles in 'harvesting' or 'post-harvest' status yet.
          Once you record a harvest in the Crop activity, this calculator will
          tell you whether to sell now or store.
        </Text>
        <TouchableOpacity
          style={styles.errorBtn}
          onPress={() => router.replace("/activity-crop" as any)}
        >
          <Text style={styles.errorBtnText}>Open crop activity</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Step 1 — What did you harvest? ──
  if (step === 1) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderFeedbackCard()}
        {renderStepper()}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>1. What did you harvest?</Text>
          <Text style={styles.stepSub}>
            We pulled this from your Crop activity. Tap Next if it's right, or go back
            to your activity to fix it.
          </Text>

          <View style={styles.harvestCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={styles.harvestEmoji}>🌾</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.harvestTitle}>
                  {defaults.cycle.selfDeclaredCrop || "Crop"} — {defaults.cycle.season} {defaults.cycle.year}
                </Text>
                <Text style={styles.harvestSub}>
                  Harvested {defaults.harvestDate ? formatDate(defaults.harvestDate) : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.harvestRow}>
              <View style={styles.harvestStat}>
                <Text style={styles.harvestStatLabel}>Quantity</Text>
                <Text style={styles.harvestStatValue}>
                  {defaults.quantityQuintals?.toFixed(1) || "—"} qtl
                </Text>
              </View>
              <View style={styles.harvestStat}>
                <Text style={styles.harvestStatLabel}>You spent</Text>
                <Text style={styles.harvestStatValue}>
                  {formatRupees(defaults.costOfCultivation || 0)}
                </Text>
              </View>
              <View style={styles.harvestStat}>
                <Text style={styles.harvestStatLabel}>Per hectare</Text>
                <Text style={styles.harvestStatValue}>
                  {formatRupees(defaults.costPerHectare || 0)}
                </Text>
              </View>
            </View>
          </View>

          <PrimaryBtn label="Next: Where will you sell? →" onPress={() => setStep(2)} />
        </View>
      </ScrollView>
    );
  }

  // ── Step 2 — Where are you selling? ──
  if (step === 2) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderStepper()}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>2. Where will you sell?</Text>
          <Text style={styles.stepSub}>
            We'll use today's mandi price as the baseline. The forecast horizons
            (21 / 45 / 60 days) come from PULSE.
          </Text>

          <View style={styles.factCard}>
            <Text style={styles.factLabel}>📍 TODAY'S MANDI PRICE</Text>
            <Text style={styles.factValue}>{formatRupees(defaults.openMarketPrice)}/qtl</Text>
            <Text style={styles.factSub}>at the nearest seeded mandi</Text>
          </View>
          <View style={[styles.factCard, { borderLeftColor: "#1565c0" }]}>
            <Text style={styles.factLabel}>🏛 GOVERNMENT MSP</Text>
            <Text style={[styles.factValue, { color: "#1565c0" }]}>{formatRupees(defaults.mspPrice)}/qtl</Text>
            <Text style={styles.factSub}>support price floor</Text>
          </View>
          <View style={[styles.factCard, { borderLeftColor: "#7c5800" }]}>
            <Text style={styles.factLabel}>📈 PULSE FORECAST (next 60 days)</Text>
            <Text style={[styles.factValue, { color: "#7c5800" }]}>
              +{defaults.priceChange21d}% / +{defaults.priceChange45d}% / +{defaults.priceChange60d}%
            </Text>
            <Text style={styles.factSub}>21 day / 45 day / 60 day</Text>
          </View>

          <View style={styles.btnRow}>
            <SecondaryBtn label="← Back" onPress={() => setStep(1)} />
            <PrimaryBtn label="Next: Costs →" onPress={() => setStep(3)} />
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Step 3 — Costs we factored in ──
  if (step === 3) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderStepper()}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>3. Costs we factored in</Text>
          <Text style={styles.stepSub}>
            These are auto-pulled from your Crop activity and your active loan.
            Tap any row to override.
          </Text>

          <CostRow
            emoji="🌾"
            label="Cost of cultivation"
            sublabel="from your Crop activity"
            value={costOfCultivation}
            onChangeText={setCostOfCultivation}
            unit="₹ total"
          />
          <CostRow
            emoji="🚛"
            label="Transport to mandi"
            sublabel="standard mandi-yard rate"
            value={transportPerQtl}
            onChangeText={setTransportPerQtl}
            unit="₹/qtl"
          />
          <CostRow
            emoji="🏛"
            label="Mandi commission"
            sublabel="standard APMC fee"
            value={mandiFeePercent}
            onChangeText={setMandiFeePercent}
            unit="%"
          />
          <CostRow
            emoji="📦"
            label="Storage cost (if storing)"
            sublabel="WDRA warehouse rate"
            value={storageCostPerDay}
            onChangeText={setStorageCostPerDay}
            unit="₹/qtl/day"
          />

          {defaults.preSowingAmount > 0 && (
            <View style={styles.loanCard}>
              <Text style={styles.loanLabel}>🏦 Active loan factored in</Text>
              <Text style={styles.loanValue}>
                {formatRupees(defaults.preSowingAmount)} @ {defaults.preSowingRate}% p.a.
              </Text>
              <Text style={styles.loanSub}>
                {defaults.preSowingElapsedDays} days since disbursement
                {defaults.nextEmi && ` · next EMI ${formatDate(defaults.nextEmi.dueDate)}`}
              </Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <SecondaryBtn label="← Back" onPress={() => setStep(2)} />
            <PrimaryBtn label="Calculate →" onPress={() => setStep(4)} />
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Step 4 — The recommendation ──
  if (step === 4) {
    if (calculating || !advisor) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c5800" />
          <Text style={styles.loadingText}>Running 5 scenarios...</Text>
        </View>
      );
    }
    const rec = advisor.recommendation;
    const isStore = rec.bestOption.toLowerCase().includes("store");
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderStepper()}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>4. The recommendation</Text>

          <View style={[styles.recBadge, isStore && styles.recBadgeStore]}>
            <Text style={styles.recBadgeLabel}>SYSTEM RECOMMENDS</Text>
            <Text style={styles.recBadgeValue}>{rec.bestOption.toUpperCase()}</Text>
            <Text style={styles.recBadgeNet}>
              ≈ {formatRupees(rec.bestNetTotal)} net · {formatRupees(rec.bestNetPerQtl)}/qtl
            </Text>
          </View>

          <Text style={styles.rationale}>{rec.rationale}</Text>

          {/* 5 scenario cards */}
          <Text style={styles.sectionLabel}>All 5 scenarios</Text>
          <ScenarioRow label="📍 Sell Now (Open)" scenario={advisor.scenarios.now} />
          <ScenarioRow label="🏛 Sell at MSP" scenario={advisor.scenarios.msp} />
          <ScenarioRow label="📦 Store 21 days" scenario={advisor.scenarios.d21} />
          <ScenarioRow label="📦 Store 45 days" scenario={advisor.scenarios.d45} />
          <ScenarioRow label="📦 Store 60 days" scenario={advisor.scenarios.d60} />

          {/* EMI nudge */}
          {defaults.nextEmi && (
            <View
              style={[
                styles.emiNudge,
                rec.bestNetTotal < defaults.nextEmi.dueAmount && styles.emiNudgeAmber,
              ]}
            >
              <Text style={styles.emiNudgeText}>
                🏦 Your next EMI is {formatRupees(defaults.nextEmi.dueAmount)} due in{" "}
                {defaults.nextEmi.daysToEmi} days
                {rec.bestNetTotal < defaults.nextEmi.dueAmount &&
                  " — chosen scenario won't fully cover it"}
              </Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <SecondaryBtn label="← Back" onPress={() => setStep(3)} />
            <PrimaryBtn label="Try a different number →" onPress={() => setStep(5)} />
          </View>

          <SecondaryBtn label="Save this decision →" onPress={() => setStep(6)} />
        </View>
      </ScrollView>
    );
  }

  // ── Step 5 — Scenario simulator ──
  if (step === 5) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderStepper()}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>5. Try a different number</Text>
          <Text style={styles.stepSub}>
            Change the price you expect or how long you can wait. We'll re-run all
            5 scenarios.
          </Text>

          <Text style={styles.fieldLabel}>Expected price per quintal (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={simPrice}
            onChangeText={setSimPrice}
            placeholder="e.g. 2500"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.fieldLabel}>Quantity (quintals)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(defaults.quantityQuintals || 0)}
            editable={false}
          />

          <PrimaryBtn
            label="Re-run scenarios"
            onPress={() => {
              runAdvisor({ openMarketPrice: num(simPrice) });
              setStep(4);
            }}
          />

          {advisor && (
            <View style={styles.simResult}>
              <Text style={styles.simResultLabel}>Current best</Text>
              <Text style={styles.simResultValue}>
                {advisor.recommendation.bestOption} — {formatRupees(advisor.recommendation.bestNetTotal)}
              </Text>
            </View>
          )}

          <SecondaryBtn label="← Back to recommendation" onPress={() => setStep(4)} />
        </View>
      </ScrollView>
    );
  }

  // ── Step 6 — Save my decision ──
  if (step === 6) {
    if (savedRecommendationId) {
      return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {renderStepper()}
          <View style={styles.stepCard}>
            <View style={styles.savedCard}>
              <Text style={styles.savedEmoji}>✅</Text>
              <Text style={styles.savedTitle}>Decision saved</Text>
              <Text style={styles.savedSub}>
                Reference #{savedRecommendationId}. Come back here any time to update what
                you actually sold for so we can improve our forecasts.
              </Text>
              <PrimaryBtn label="Done — back to home" onPress={() => router.replace("/(tabs)" as any)} />
            </View>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderStepper()}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>6. Save my decision</Text>
          <Text style={styles.stepSub}>
            What are you actually going to do? We'll save this so the bank can see
            your plan and you can come back to it.
          </Text>

          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => saveDecision("Sell now (Open)")}
            disabled={saving}
          >
            <Text style={styles.choiceEmoji}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>I'll sell now</Text>
              <Text style={styles.choiceSub}>Take the cash today, no storage risk</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => saveDecision("Store & sell 21d")}
            disabled={saving}
          >
            <Text style={styles.choiceEmoji}>📦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>I'll store for 21 days</Text>
              <Text style={styles.choiceSub}>Wait 3 weeks for prices to firm up</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => saveDecision("Store & sell 45d")}
            disabled={saving}
          >
            <Text style={styles.choiceEmoji}>📦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>I'll store for 45 days</Text>
              <Text style={styles.choiceSub}>Wait 6 weeks for the seasonal price rise</Text>
            </View>
          </TouchableOpacity>

          {saving && <ActivityIndicator size="small" color="#7c5800" style={{ marginTop: 12 }} />}

          <SecondaryBtn label="← Back to recommendation" onPress={() => setStep(4)} />
        </View>
      </ScrollView>
    );
  }

  return null;
}

// ─── Sub-components ───────────────────────────────────────────────

const PrimaryBtn = ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
  <TouchableOpacity
    style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
  >
    <Text style={styles.primaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

const SecondaryBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.secondaryBtn} onPress={onPress} activeOpacity={0.85}>
    <Text style={styles.secondaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

const CostRow = ({
  emoji,
  label,
  sublabel,
  value,
  onChangeText,
  unit,
}: {
  emoji: string;
  label: string;
  sublabel: string;
  value: string;
  onChangeText: (s: string) => void;
  unit: string;
}) => (
  <View style={styles.costRow}>
    <Text style={styles.costEmoji}>{emoji}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={styles.costSub}>{sublabel}</Text>
    </View>
    <View style={{ alignItems: "flex-end" }}>
      <TextInput
        style={styles.costInput}
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeText}
      />
      <Text style={styles.costUnit}>{unit}</Text>
    </View>
  </View>
);

const ScenarioRow = ({ label, scenario }: { label: string; scenario: ScenarioCard }) => (
  <View style={styles.scenarioRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.scenarioLabel}>{label}</Text>
      <Text style={styles.scenarioSub}>
        ₹{Math.round(scenario.salePrice)}/qtl gross
        {scenario.holdingCost.total > 0 && ` · −₹${Math.round(scenario.holdingCost.total)} hold`}
      </Text>
    </View>
    <Text
      style={[
        styles.scenarioNet,
        scenario.afterLoans < 0 && { color: "#c62828" },
      ]}
    >
      {formatRupees(scenario.netTotal)}
    </Text>
  </View>
);

// ─── Helpers ──────────────────────────────────────────────────────

function num(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, fontSize: 13, color: "#666" },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: "900", color: "#333" },
  errorSub: { fontSize: 13, color: "#666", marginTop: 8, textAlign: "center", lineHeight: 19 },
  errorBtn: { marginTop: 18, backgroundColor: "#7c5800", padding: 12, borderRadius: 12, paddingHorizontal: 24 },
  errorBtnText: { color: "#fff", fontWeight: "800" },

  // Stepper
  stepper: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 16 },
  stepDot: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  stepDotActive: { backgroundColor: "#7c5800" },
  stepDotInactive: { backgroundColor: "#e0e0e0" },
  stepDotText: { fontSize: 14, fontWeight: "900" },
  stepDotTextActive: { color: "#fff" },
  stepDotTextInactive: { color: "#888" },

  // Step card
  stepCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  stepTitle: { fontSize: 19, fontWeight: "900", color: "#7c5800" },
  stepSub: { fontSize: 12, color: "#666", marginTop: 6, lineHeight: 17 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: "#555", marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#555", marginTop: 18, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },

  // Step 1 harvest card
  harvestCard: {
    backgroundColor: "#fff8e1", borderRadius: 12, padding: 14,
    marginTop: 14, borderLeftWidth: 4, borderLeftColor: "#7c5800",
  },
  harvestEmoji: { fontSize: 32 },
  harvestTitle: { fontSize: 16, fontWeight: "900", color: "#7c5800" },
  harvestSub: { fontSize: 12, color: "#5d4037", marginTop: 2 },
  harvestRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, gap: 8 },
  harvestStat: { flex: 1, backgroundColor: "#fff", padding: 10, borderRadius: 8 },
  harvestStatLabel: { fontSize: 9, color: "#888", fontWeight: "800", textTransform: "uppercase" },
  harvestStatValue: { fontSize: 14, fontWeight: "900", color: "#7c5800", marginTop: 4 },

  // Step 2 fact cards
  factCard: {
    backgroundColor: "#fafafa", borderRadius: 10, padding: 12,
    marginTop: 12, borderLeftWidth: 4, borderLeftColor: "#2e7d32",
  },
  factLabel: { fontSize: 10, fontWeight: "800", color: "#666", textTransform: "uppercase", letterSpacing: 0.3 },
  factValue: { fontSize: 18, fontWeight: "900", color: "#2e7d32", marginTop: 4 },
  factSub: { fontSize: 11, color: "#888", marginTop: 3 },

  // Step 3 cost rows
  costRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  costEmoji: { fontSize: 22 },
  costLabel: { fontSize: 13, fontWeight: "700", color: "#333" },
  costSub: { fontSize: 11, color: "#888", marginTop: 2 },
  costInput: {
    width: 90, padding: 8, fontSize: 14, fontWeight: "800",
    color: "#7c5800", borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 8, textAlign: "right",
  },
  costUnit: { fontSize: 10, color: "#888", marginTop: 4 },

  loanCard: {
    backgroundColor: "#e3f2fd", borderRadius: 10, padding: 12,
    marginTop: 14, borderLeftWidth: 4, borderLeftColor: "#1565c0",
  },
  loanLabel: { fontSize: 10, fontWeight: "800", color: "#1565c0", textTransform: "uppercase", letterSpacing: 0.3 },
  loanValue: { fontSize: 15, fontWeight: "900", color: "#0d47a1", marginTop: 4 },
  loanSub: { fontSize: 11, color: "#1565c0", marginTop: 3 },

  // Step 4 recommendation badge
  recBadge: {
    backgroundColor: "#1b5e20", borderRadius: 14,
    padding: 18, marginTop: 14, alignItems: "center",
  },
  recBadgeStore: { backgroundColor: "#7c5800" },
  recBadgeLabel: { fontSize: 11, color: "#a5d6a7", fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  recBadgeValue: { fontSize: 22, fontWeight: "900", color: "#fff", marginTop: 6 },
  recBadgeNet: { fontSize: 13, color: "#a5d6a7", marginTop: 6, fontWeight: "700" },

  rationale: {
    fontSize: 12, color: "#444", marginTop: 14, lineHeight: 18,
    backgroundColor: "#fafafa", padding: 12, borderRadius: 8,
  },

  scenarioRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  scenarioLabel: { fontSize: 13, fontWeight: "800", color: "#333" },
  scenarioSub: { fontSize: 11, color: "#888", marginTop: 2 },
  scenarioNet: { fontSize: 16, fontWeight: "900", color: "#1b5e20" },

  emiNudge: {
    backgroundColor: "#e8f5e9", borderRadius: 10, padding: 12,
    marginTop: 14, borderLeftWidth: 4, borderLeftColor: "#2e7d32",
  },
  emiNudgeAmber: { backgroundColor: "#fff8e1", borderLeftColor: "#7c5800" },
  emiNudgeText: { fontSize: 12, color: "#333", fontWeight: "700" },

  // Step 5 simulator
  input: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12,
    padding: 14, fontSize: 16, color: "#222",
  },
  simResult: {
    backgroundColor: "#fafafa", borderRadius: 10, padding: 12,
    marginTop: 14,
  },
  simResultLabel: { fontSize: 10, fontWeight: "800", color: "#888", textTransform: "uppercase" },
  simResultValue: { fontSize: 14, fontWeight: "900", color: "#7c5800", marginTop: 4 },

  // Step 6 choices
  choiceBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    marginTop: 12, borderWidth: 2, borderColor: "#e0e0e0",
  },
  choiceEmoji: { fontSize: 32 },
  choiceTitle: { fontSize: 15, fontWeight: "900", color: "#333" },
  choiceSub: { fontSize: 12, color: "#666", marginTop: 4 },

  savedCard: { alignItems: "center", padding: 24 },
  savedEmoji: { fontSize: 56 },
  savedTitle: { fontSize: 22, fontWeight: "900", color: "#1b5e20", marginTop: 14 },
  savedSub: { fontSize: 13, color: "#666", marginTop: 10, textAlign: "center", lineHeight: 19, marginBottom: 18 },

  // Buttons
  primaryBtn: { backgroundColor: "#7c5800", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 18, flex: 1 },
  primaryBtnDisabled: { opacity: 0.5, cursor: "not-allowed" as any },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryBtn: { backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 14, borderWidth: 1.5, borderColor: "#e0e0e0" },
  secondaryBtnText: { color: "#666", fontSize: 14, fontWeight: "700" },
  btnRow: { flexDirection: "row", gap: 10 },

  // Phase 2 — "How did it go?" feedback card
  feedbackCard: {
    backgroundColor: "#fff8e1",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#ffd54f",
  },
  feedbackTitle: { fontSize: 16, fontWeight: "900", color: "#7c5800" },
  feedbackSub: { fontSize: 12, color: "#5d4037", marginTop: 4, lineHeight: 17 },
  feedbackQ: { fontSize: 12, fontWeight: "700", color: "#5d4037", marginTop: 12 },
  feedbackBtnRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  feedbackBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ffd54f",
    alignItems: "center",
  },
  feedbackBtnActive: { backgroundColor: "#7c5800", borderColor: "#7c5800" },
  feedbackBtnText: { fontSize: 13, fontWeight: "700", color: "#7c5800" },
  feedbackBtnTextActive: { color: "#fff" },
  feedbackInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ffd54f",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#212121",
    marginTop: 6,
  },
  feedbackSubmit: {
    backgroundColor: "#7c5800",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  feedbackSubmitDisabled: { opacity: 0.5 },
  feedbackSubmitText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
