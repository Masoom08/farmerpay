/**
 * Insurance Point-of-Sale screen — Insurance Phase 2
 *
 * FarmerPay is NOT an insurer. This screen shows the farmer two
 * buckets of offers (government-subsidized + non-subsidized private),
 * lets them calculate a quote, and then redirects them to the actual
 * insurer's portal / phone / nearest CSC for policy issuance.
 *
 * Every tap is logged to pos_insurance_referrals for the banker-side
 * funnel analytics (viewed → quoted → referred).
 *
 * Endpoints used:
 *   GET  /insurance/products?subsidyType=government | non_subsidized
 *   GET  /insurance/products/:id
 *   POST /insurance/quote
 *   POST /insurance/referrals
 *   GET  /insurance/referrals/me
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost, formatRupees } from "../lib/api";

// ─── Types (match the backend shapes) ──────────────────────────────

type SubsidyType = "government" | "non_subsidized";
type Category = "crop" | "horticulture" | "livestock" | "fisheries" | "multi";
type Action = "viewed" | "quoted" | "referred";
type Tab = "government" | "private" | "my_referrals";

interface InsuranceProduct {
  id: number;
  productCode: string;
  productName: string;
  category: Category;
  categoryLabel: string;
  subsidyType: SubsidyType;
  subScheme: string;
  subSchemeLabel: string;
  insurerName: string | null;
  farmerPremiumRate: number | null;
  subsidyPct: number | null;
  coverageDescription: string | null;
  eligibilityRules: Record<string, unknown> | null;
  deepLinkUrl: string | null;
  portalUrl: string | null;
  contactPhone: string | null;
  branchHint: string | null;
  displayOrder: number;
}

interface Quote {
  productId: number;
  productCode: string;
  productName: string;
  subsidyType: SubsidyType;
  insurerName: string | null;
  inputs: {
    sumInsured: number;
    season: string | null;
    areaHectares: number | null;
    crop: string | null;
  };
  farmerPremiumRate: number | null;
  actuarialPremium: number;
  farmerPremium: number;
  subsidyAmount: number;
  totalCost: number;
  savings: number;
  currency: string;
  disclosure: string;
}

interface ReferralRow {
  referralId: number;
  referralUuid: string;
  action: Action;
  quotedSumInsured: number | null;
  quotedPremiumFarmer: number | null;
  quotedPremiumSubsidy: number | null;
  quotedCrop: string | null;
  quotedSeason: string | null;
  referredAt: string;
  product: {
    productId: number;
    productCode: string;
    productName: string;
    subsidyType: SubsidyType;
    insurerName: string | null;
    deepLinkUrl: string | null;
    contactPhone: string | null;
  } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<Category, string> = {
  crop: "🌾",
  horticulture: "🥭",
  livestock: "🐄",
  fisheries: "🐟",
  multi: "📦",
};

const SCHEME_BANNER: Record<string, { title: string; tagline: string }> = {
  pmfby: {
    title: "PMFBY — Crop Insurance",
    tagline: "Pradhan Mantri Fasal Bima Yojana · 1.5–5% farmer premium",
  },
  rwbcis: {
    title: "RWBCIS — Weather Based",
    tagline: "Auto-payout when weather thresholds are breached",
  },
  nlm: {
    title: "NLM — Livestock",
    tagline: "National Livestock Mission · 60–80% subsidy",
  },
  pmmsy: {
    title: "PMMSY — Fisheries",
    tagline: "Pradhan Mantri Matsya Sampada Yojana",
  },
};

// ─── Component ──────────────────────────────────────────────────────

export default function InsuranceScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("government");
  const [loading, setLoading] = useState(true);
  const [govProducts, setGovProducts] = useState<InsuranceProduct[]>([]);
  const [privateProducts, setPrivateProducts] = useState<InsuranceProduct[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<InsuranceProduct | null>(null);
  const [quoteSumInsured, setQuoteSumInsured] = useState<string>("");
  const [quoteSeason, setQuoteSeason] = useState<"kharif" | "rabi">("kharif");
  const [quoteArea, setQuoteArea] = useState<string>("");
  const [quoteCrop, setQuoteCrop] = useState<string>("");
  const [quoteResult, setQuoteResult] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // ── Initial data load ──
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gov, priv, mine] = await Promise.all([
        apiGet("/insurance/products?subsidyType=government").catch(() => ({ data: [] })),
        apiGet("/insurance/products?subsidyType=non_subsidized").catch(() => ({ data: [] })),
        apiGet("/insurance/referrals/me").catch(() => ({ data: [] })),
      ]);
      setGovProducts((gov?.data || []) as InsuranceProduct[]);
      setPrivateProducts((priv?.data || []) as InsuranceProduct[]);
      setReferrals((mine?.data || []) as ReferralRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Open product detail modal + log a "viewed" referral ──
  const openProduct = async (product: InsuranceProduct) => {
    setSelectedProduct(product);
    setQuoteResult(null);
    setQuoteError(null);
    setQuoteSumInsured("");
    setQuoteArea("");
    setQuoteCrop("");
    // Non-blocking referral log
    try {
      await apiPost("/insurance/referrals", { productId: product.id, action: "viewed" });
    } catch {
      // silent
    }
  };

  const closeProduct = () => {
    setSelectedProduct(null);
    setQuoteResult(null);
    setQuoteError(null);
  };

  // ── Run quote ──
  const runQuote = async () => {
    if (!selectedProduct) return;
    const si = parseFloat(quoteSumInsured || "0");
    if (!Number.isFinite(si) || si < 1000) {
      setQuoteError("Enter a sum insured of at least ₹1,000");
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await apiPost("/insurance/quote", {
        productId: selectedProduct.id,
        sumInsured: si,
        season: quoteSeason,
        areaHectares: quoteArea ? parseFloat(quoteArea) : undefined,
        crop: quoteCrop || undefined,
      });
      setQuoteResult((res?.data || res) as Quote);
      // Reload referrals in the background so the "My Referrals" tab stays fresh
      apiGet("/insurance/referrals/me")
        .then((r) => setReferrals((r?.data || []) as ReferralRow[]))
        .catch(() => {});
    } catch (e: any) {
      setQuoteError(e?.message || "Couldn't calculate quote");
    } finally {
      setQuoteLoading(false);
    }
  };

  // ── Redirect actions (portal, phone, branch) ──
  const redirectAndLog = async (redirectType: "portal" | "phone", url: string) => {
    if (!selectedProduct) return;
    // Log the referral first (best-effort, non-blocking)
    try {
      await apiPost("/insurance/referrals", {
        productId: selectedProduct.id,
        action: "referred",
        sumInsured: quoteResult?.inputs.sumInsured,
        farmerPremium: quoteResult?.farmerPremium,
        subsidyAmount: quoteResult?.subsidyAmount,
        crop: quoteResult?.inputs.crop,
        season: quoteResult?.inputs.season,
      });
    } catch {
      // silent
    }
    try {
      await Linking.openURL(url);
    } catch {
      // Linking failure is non-fatal
    }
    // Refresh the referrals tab in background
    apiGet("/insurance/referrals/me")
      .then((r) => setReferrals((r?.data || []) as ReferralRow[]))
      .catch(() => {});
  };

  // ── Grouped gov products by sub_scheme for pretty rendering ──
  const groupedGov = useMemo(() => {
    const groups: Record<string, InsuranceProduct[]> = {};
    for (const p of govProducts) {
      if (!groups[p.subScheme]) groups[p.subScheme] = [];
      groups[p.subScheme].push(p);
    }
    return groups;
  }, [govProducts]);

  // ─── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565c0" />
        <Text style={styles.loadingText}>Loading insurance offers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Insurance Offers</Text>
          <Text style={styles.headerSub}>
            FarmerPay is your point of sale. Policies are issued directly by the insurer.
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TabBtn
          label={`Government (${govProducts.length})`}
          active={activeTab === "government"}
          onPress={() => setActiveTab("government")}
        />
        <TabBtn
          label={`Private (${privateProducts.length})`}
          active={activeTab === "private"}
          onPress={() => setActiveTab("private")}
        />
        <TabBtn
          label={`My Referrals (${referrals.length})`}
          active={activeTab === "my_referrals"}
          onPress={() => setActiveTab("my_referrals")}
        />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* ─── Government tab ─── */}
        {activeTab === "government" &&
          Object.entries(groupedGov).map(([scheme, products]) => {
            const banner = SCHEME_BANNER[scheme];
            return (
              <View key={scheme} style={styles.schemeSection}>
                {banner && (
                  <View style={styles.schemeBanner}>
                    <Text style={styles.schemeBannerTitle}>{banner.title}</Text>
                    <Text style={styles.schemeBannerTag}>{banner.tagline}</Text>
                  </View>
                )}
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onPress={() => openProduct(p)} />
                ))}
              </View>
            );
          })}

        {/* ─── Private tab ─── */}
        {activeTab === "private" && (
          <View style={styles.schemeSection}>
            <View style={styles.schemeBanner}>
              <Text style={styles.schemeBannerTitle}>Private Insurance</Text>
              <Text style={styles.schemeBannerTag}>
                Market-rate premium · no government subsidy
              </Text>
            </View>
            {privateProducts.map((p) => (
              <ProductCard key={p.id} product={p} onPress={() => openProduct(p)} />
            ))}
          </View>
        )}

        {/* ─── My Referrals tab ─── */}
        {activeTab === "my_referrals" && (
          <View>
            {referrals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No referrals yet</Text>
                <Text style={styles.emptySub}>
                  Browse Government or Private tabs to get quotes. Your activity will show up here.
                </Text>
              </View>
            ) : (
              referrals.map((r) => (
                <ReferralCard
                  key={r.referralId}
                  referral={r}
                  onRedirect={(url) => {
                    if (r.product?.deepLinkUrl) {
                      Linking.openURL(url).catch(() => {});
                    }
                  }}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Product detail modal */}
      <Modal
        visible={selectedProduct !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={closeProduct}
      >
        {selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            quoteSumInsured={quoteSumInsured}
            setQuoteSumInsured={setQuoteSumInsured}
            quoteSeason={quoteSeason}
            setQuoteSeason={setQuoteSeason}
            quoteArea={quoteArea}
            setQuoteArea={setQuoteArea}
            quoteCrop={quoteCrop}
            setQuoteCrop={setQuoteCrop}
            quoteResult={quoteResult}
            quoteLoading={quoteLoading}
            quoteError={quoteError}
            onRunQuote={runQuote}
            onRedirect={redirectAndLog}
            onClose={closeProduct}
          />
        )}
      </Modal>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

const TabBtn = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.tabBtn, active && styles.tabBtnActive]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ProductCard = ({ product, onPress }: { product: InsuranceProduct; onPress: () => void }) => (
  <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.85}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={styles.productEmoji}>{CATEGORY_ICON[product.category]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>{product.productName}</Text>
        <Text style={styles.productInsurer}>
          {product.insurerName || "—"} · {product.categoryLabel}
        </Text>
      </View>
      <View style={styles.rateChip}>
        <Text style={styles.rateChipLabel}>You pay</Text>
        <Text style={styles.rateChipValue}>{product.farmerPremiumRate ?? 0}%</Text>
      </View>
    </View>
    {product.subsidyType === "government" && product.subsidyPct != null && (
      <View style={styles.subsidyBadge}>
        <Text style={styles.subsidyBadgeText}>
          🏛 Govt. pays up to {product.subsidyPct}% of actuarial premium
        </Text>
      </View>
    )}
    <Text style={styles.productCta}>View details & get quote →</Text>
  </TouchableOpacity>
);

const ReferralCard = ({
  referral,
  onRedirect,
}: {
  referral: ReferralRow;
  onRedirect: (url: string) => void;
}) => {
  const p = referral.product;
  if (!p) return null;
  const actionColors: Record<Action, string> = {
    viewed: "#9e9e9e",
    quoted: "#1565c0",
    referred: "#2e7d32",
  };
  return (
    <View style={styles.referralCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={styles.referralProduct} numberOfLines={2}>
          {p.productName}
        </Text>
        <View
          style={[
            styles.actionBadge,
            { backgroundColor: actionColors[referral.action] + "20", borderColor: actionColors[referral.action] },
          ]}
        >
          <Text style={[styles.actionBadgeText, { color: actionColors[referral.action] }]}>
            {referral.action}
          </Text>
        </View>
      </View>
      <Text style={styles.referralInsurer}>{p.insurerName || ""}</Text>
      {referral.quotedPremiumFarmer != null && (
        <Text style={styles.referralQuoted}>
          Quote: you pay {formatRupees(referral.quotedPremiumFarmer)}
          {referral.quotedPremiumSubsidy && referral.quotedPremiumSubsidy > 0
            ? ` · govt. pays ${formatRupees(referral.quotedPremiumSubsidy)}`
            : ""}
        </Text>
      )}
      <Text style={styles.referralDate}>{new Date(referral.referredAt).toLocaleString("en-IN")}</Text>
      {p.deepLinkUrl && (
        <TouchableOpacity
          style={styles.referralRedirectBtn}
          onPress={() => onRedirect(p.deepLinkUrl!)}
          activeOpacity={0.85}
        >
          <Text style={styles.referralRedirectText}>Visit {p.insurerName || "insurer"} portal →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Product detail modal ───────────────────────────────────────────

const ProductDetail = ({
  product,
  quoteSumInsured,
  setQuoteSumInsured,
  quoteSeason,
  setQuoteSeason,
  quoteArea,
  setQuoteArea,
  quoteCrop,
  setQuoteCrop,
  quoteResult,
  quoteLoading,
  quoteError,
  onRunQuote,
  onRedirect,
  onClose,
}: {
  product: InsuranceProduct;
  quoteSumInsured: string;
  setQuoteSumInsured: (s: string) => void;
  quoteSeason: "kharif" | "rabi";
  setQuoteSeason: (s: "kharif" | "rabi") => void;
  quoteArea: string;
  setQuoteArea: (s: string) => void;
  quoteCrop: string;
  setQuoteCrop: (s: string) => void;
  quoteResult: Quote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  onRunQuote: () => void;
  onRedirect: (type: "portal" | "phone", url: string) => void;
  onClose: () => void;
}) => {
  const showCalculator = ["crop", "horticulture", "livestock"].includes(product.category);
  const rules = product.eligibilityRules || {};

  return (
    <ScrollView style={styles.modalScroll}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
          <Text style={styles.modalCloseText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modalBody}>
        <View style={styles.modalHero}>
          <Text style={styles.modalEmoji}>{CATEGORY_ICON[product.category]}</Text>
          <Text style={styles.modalTitle}>{product.productName}</Text>
          <Text style={styles.modalInsurer}>{product.insurerName || ""}</Text>
          <View style={styles.modalBadgeRow}>
            <View
              style={[
                styles.modalBadge,
                product.subsidyType === "government" ? styles.modalBadgeGov : styles.modalBadgePriv,
              ]}
            >
              <Text
                style={[
                  styles.modalBadgeText,
                  product.subsidyType === "government" ? styles.modalBadgeTextGov : styles.modalBadgeTextPriv,
                ]}
              >
                {product.subsidyType === "government" ? "🏛 Government Subsidized" : "🏢 Private · No Subsidy"}
              </Text>
            </View>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>
                {product.categoryLabel} · {product.farmerPremiumRate}%
              </Text>
            </View>
          </View>
        </View>

        {/* Coverage */}
        {product.coverageDescription && (
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>📋 Coverage</Text>
            <Text style={styles.modalSectionText}>{product.coverageDescription}</Text>
          </View>
        )}

        {/* Eligibility */}
        {Object.keys(rules).length > 0 && (
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>✅ Eligibility</Text>
            {Object.entries(rules).map(([k, v]) => (
              <Text key={k} style={styles.modalSectionText}>
                • {humanizeRule(k)}: {formatRuleValue(v)}
              </Text>
            ))}
          </View>
        )}

        {/* Premium Calculator */}
        {showCalculator && (
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>💰 Get a quote</Text>

            <Text style={styles.fieldLabel}>Sum insured (₹)</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="numeric"
              placeholder="e.g. 100000"
              placeholderTextColor="#aaa"
              value={quoteSumInsured}
              onChangeText={setQuoteSumInsured}
            />

            {product.category !== "livestock" && (
              <>
                <Text style={styles.fieldLabel}>Season</Text>
                <View style={styles.seasonRow}>
                  <TouchableOpacity
                    style={[styles.seasonBtn, quoteSeason === "kharif" && styles.seasonBtnActive]}
                    onPress={() => setQuoteSeason("kharif")}
                  >
                    <Text
                      style={[
                        styles.seasonBtnText,
                        quoteSeason === "kharif" && styles.seasonBtnTextActive,
                      ]}
                    >
                      Kharif
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.seasonBtn, quoteSeason === "rabi" && styles.seasonBtnActive]}
                    onPress={() => setQuoteSeason("rabi")}
                  >
                    <Text
                      style={[
                        styles.seasonBtnText,
                        quoteSeason === "rabi" && styles.seasonBtnTextActive,
                      ]}
                    >
                      Rabi
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Area (hectares, optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  placeholder="e.g. 2.5"
                  placeholderTextColor="#aaa"
                  value={quoteArea}
                  onChangeText={setQuoteArea}
                />

                <Text style={styles.fieldLabel}>Crop (optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Wheat"
                  placeholderTextColor="#aaa"
                  value={quoteCrop}
                  onChangeText={setQuoteCrop}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, quoteLoading && styles.primaryBtnDisabled]}
              onPress={onRunQuote}
              disabled={quoteLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {quoteLoading ? "Calculating..." : "Calculate quote"}
              </Text>
            </TouchableOpacity>

            {quoteError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{quoteError}</Text>
              </View>
            )}

            {quoteResult && (
              <View style={styles.quoteResult}>
                <Text style={styles.quoteResultTitle}>Your quote</Text>
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>You pay</Text>
                  <Text style={styles.quoteValue}>{formatRupees(quoteResult.farmerPremium)}</Text>
                </View>
                {quoteResult.subsidyAmount > 0 && (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Govt. pays</Text>
                    <Text style={[styles.quoteValue, styles.quoteValueGreen]}>
                      {formatRupees(quoteResult.subsidyAmount)}
                    </Text>
                  </View>
                )}
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Total premium</Text>
                  <Text style={styles.quoteValueMuted}>{formatRupees(quoteResult.actuarialPremium)}</Text>
                </View>
                {quoteResult.savings > 0 && (
                  <View style={styles.savingsBanner}>
                    <Text style={styles.savingsText}>
                      🎉 Your savings: {formatRupees(quoteResult.savings)}
                    </Text>
                  </View>
                )}
                <Text style={styles.disclosureText}>{quoteResult.disclosure}</Text>
              </View>
            )}
          </View>
        )}

        {/* Redirect CTAs */}
        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>🚀 Get this policy</Text>
          <Text style={styles.redirectSub}>
            FarmerPay doesn't issue the policy. Use one of these to contact {product.insurerName || "the insurer"}:
          </Text>

          {product.deepLinkUrl && (
            <TouchableOpacity
              style={styles.redirectBtn}
              onPress={() => onRedirect("portal", product.deepLinkUrl!)}
              activeOpacity={0.85}
            >
              <Text style={styles.redirectBtnEmoji}>🌐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.redirectBtnTitle}>Go to portal</Text>
                <Text style={styles.redirectBtnSub} numberOfLines={1}>
                  {product.deepLinkUrl}
                </Text>
              </View>
              <Text style={styles.redirectBtnArrow}>→</Text>
            </TouchableOpacity>
          )}

          {product.contactPhone && (
            <TouchableOpacity
              style={styles.redirectBtn}
              onPress={() => onRedirect("phone", `tel:${product.contactPhone}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.redirectBtnEmoji}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.redirectBtnTitle}>Call customer care</Text>
                <Text style={styles.redirectBtnSub}>{product.contactPhone}</Text>
              </View>
              <Text style={styles.redirectBtnArrow}>→</Text>
            </TouchableOpacity>
          )}

          {product.branchHint && (
            <View style={styles.branchHint}>
              <Text style={styles.branchHintEmoji}>🏦</Text>
              <Text style={styles.branchHintText}>{product.branchHint}</Text>
            </View>
          )}

          {product.portalUrl && product.portalUrl !== product.deepLinkUrl && (
            <TouchableOpacity
              style={styles.secondaryLink}
              onPress={() => Linking.openURL(product.portalUrl!).catch(() => {})}
            >
              <Text style={styles.secondaryLinkText}>View scheme guidelines →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

// ─── Eligibility rule formatters ────────────────────────────────────

const humanizeRule = (key: string): string => {
  const map: Record<string, string> = {
    minAreaHa: "Minimum area",
    maxAreaHa: "Maximum area",
    seasons: "Seasons",
    cropCategories: "Crop types",
    animalTypes: "Animal types",
    notifiedAreaOnly: "Notified area only",
    notifiedCropsOnly: "Notified crops only",
    triggerTypes: "Trigger types",
    maxAnimals: "Max animals per household",
    bplBoost: "BPL / SC / ST get higher subsidy",
    bplRequired: "BPL only",
    bplPriority: "BPL priority",
    bundled: "Bundled coverage",
    coverageTypes: "Coverage types",
    minAssetValue: "Min asset value",
    valuationRequired: "Veterinarian valuation required",
    activeFisherOnly: "Active traditional fishers only",
    vesselTypes: "Vessel types",
    noNotifiedAreaRestriction: "Available everywhere in India",
    kycRequired: "KYC required",
  };
  return map[key] || key;
};

const formatRuleValue = (v: unknown): string => {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number") return String(v);
  return String(v);
};

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5" },
  loadingText: { color: "#666", marginTop: 12 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#bbdefb",
  },
  headerEmoji: { fontSize: 42 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#0d47a1" },
  headerSub: { fontSize: 12, color: "#1565c0", marginTop: 4, lineHeight: 16 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: "#1565c0" },
  tabBtnText: { fontSize: 13, fontWeight: "700", color: "#999" },
  tabBtnTextActive: { color: "#0d47a1" },

  body: { flex: 1 },
  bodyContent: { padding: 14, paddingBottom: 40 },

  // Scheme section + banner
  schemeSection: { marginBottom: 20 },
  schemeBanner: {
    backgroundColor: "#fff3e0",
    borderLeftWidth: 4,
    borderLeftColor: "#ff8f00",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  schemeBannerTitle: { fontSize: 15, fontWeight: "900", color: "#e65100" },
  schemeBannerTag: { fontSize: 12, color: "#bf360c", marginTop: 4 },

  // Product card
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  productEmoji: { fontSize: 36 },
  productName: { fontSize: 14, fontWeight: "800", color: "#212121" },
  productInsurer: { fontSize: 11, color: "#757575", marginTop: 3 },
  rateChip: { backgroundColor: "#e3f2fd", padding: 8, borderRadius: 8, alignItems: "center" },
  rateChipLabel: { fontSize: 9, color: "#1565c0", fontWeight: "700" },
  rateChipValue: { fontSize: 16, fontWeight: "900", color: "#0d47a1" },
  subsidyBadge: {
    backgroundColor: "#e8f5e9",
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  subsidyBadgeText: { fontSize: 11, color: "#2e7d32", fontWeight: "700" },
  productCta: {
    fontSize: 12,
    color: "#1565c0",
    fontWeight: "800",
    marginTop: 10,
    textAlign: "right",
  },

  // Referral card
  referralCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  referralProduct: { flex: 1, fontSize: 13, fontWeight: "800", color: "#212121", paddingRight: 10 },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBadgeText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  referralInsurer: { fontSize: 11, color: "#757575", marginTop: 4 },
  referralQuoted: { fontSize: 12, color: "#1565c0", fontWeight: "700", marginTop: 6 },
  referralDate: { fontSize: 10, color: "#999", marginTop: 4 },
  referralRedirectBtn: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
  },
  referralRedirectText: { fontSize: 12, color: "#0d47a1", fontWeight: "700", textAlign: "center" },

  // Empty card
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#212121" },
  emptySub: { fontSize: 12, color: "#757575", marginTop: 6, textAlign: "center", lineHeight: 18 },

  // Modal
  modalScroll: { flex: 1, backgroundColor: "#f5f5f5" },
  modalHeader: { backgroundColor: "#fff", padding: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  modalCloseBtn: { alignSelf: "flex-start" },
  modalCloseText: { fontSize: 14, color: "#1565c0", fontWeight: "700" },
  modalBody: { padding: 16, paddingBottom: 40 },

  modalHero: { alignItems: "center", paddingVertical: 20 },
  modalEmoji: { fontSize: 56 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#212121", textAlign: "center", marginTop: 12 },
  modalInsurer: { fontSize: 12, color: "#757575", marginTop: 6 },
  modalBadgeRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  modalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#eceff1",
  },
  modalBadgeGov: { backgroundColor: "#e8f5e9" },
  modalBadgePriv: { backgroundColor: "#fff3e0" },
  modalBadgeText: { fontSize: 11, fontWeight: "800", color: "#455a64" },
  modalBadgeTextGov: { color: "#2e7d32" },
  modalBadgeTextPriv: { color: "#e65100" },

  modalSection: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  modalSectionTitle: { fontSize: 14, fontWeight: "900", color: "#212121", marginBottom: 8 },
  modalSectionText: { fontSize: 13, color: "#424242", lineHeight: 20 },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#666", marginTop: 12, marginBottom: 4 },
  fieldInput: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 12,
    fontSize: 15,
    color: "#212121",
  },

  seasonRow: { flexDirection: "row", gap: 10 },
  seasonBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    alignItems: "center",
  },
  seasonBtnActive: { backgroundColor: "#1565c0", borderColor: "#1565c0" },
  seasonBtnText: { fontSize: 13, fontWeight: "700", color: "#666" },
  seasonBtnTextActive: { color: "#fff" },

  primaryBtn: {
    backgroundColor: "#1565c0",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 14,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  errorBanner: {
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  errorBannerText: { fontSize: 12, color: "#c62828", fontWeight: "700" },

  quoteResult: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#1565c0",
  },
  quoteResultTitle: { fontSize: 14, fontWeight: "900", color: "#0d47a1", marginBottom: 10 },
  quoteRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  quoteLabel: { fontSize: 13, color: "#424242" },
  quoteValue: { fontSize: 14, fontWeight: "900", color: "#212121" },
  quoteValueGreen: { color: "#2e7d32" },
  quoteValueMuted: { color: "#999" },
  savingsBanner: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
  },
  savingsText: { fontSize: 13, fontWeight: "800", color: "#2e7d32", textAlign: "center" },
  disclosureText: { fontSize: 11, color: "#666", marginTop: 10, fontStyle: "italic" },

  // Redirect block
  redirectSub: { fontSize: 12, color: "#757575", marginBottom: 10 },
  redirectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fafafa",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
  },
  redirectBtnEmoji: { fontSize: 24 },
  redirectBtnTitle: { fontSize: 13, fontWeight: "800", color: "#212121" },
  redirectBtnSub: { fontSize: 11, color: "#757575", marginTop: 2 },
  redirectBtnArrow: { fontSize: 18, color: "#1565c0" },
  branchHint: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff8e1",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  branchHintEmoji: { fontSize: 18 },
  branchHintText: { flex: 1, fontSize: 12, color: "#5d4037", lineHeight: 17 },
  secondaryLink: { marginTop: 10, alignItems: "center", padding: 8 },
  secondaryLinkText: { fontSize: 12, color: "#1565c0", fontWeight: "700" },
});
