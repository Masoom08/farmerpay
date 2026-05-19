/**
 * Cycle Detail — the high-value per-cycle data entry screen.
 *
 * Data entry happens ~10 times per season through PoP-driven workbands:
 *   1. Start a workband (stage) → POST /roots/workbands/:id/execute
 *   2. Execute tasks with inputs/labor/machinery → POST /roots/tasks/:id/execute
 *   3. Complete tasks → POST /roots/tasks/:id/complete
 *   4. Record harvest → POST /roots/cycles/:id/harvest
 *   5. Record sale → POST /roots/harvest/:id/sales
 *
 * Key constraint: ALL input/labor/expense logging goes through task execution.
 * There are no cycle-level quick-log endpoints.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { apiGet, apiPost } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────

interface Cycle {
  cycleId: number;
  cycleUuid: string;
  cropName: string | null;
  cropCode: string | null;
  varietyName: string | null;
  season: string;
  sowingDate: string;
  expectedHarvestDate: string | null;
  status: string;
  fieldName: string | null;
  fieldSizeHectares: number | null;
}

interface Workband {
  id: number;
  execution_uuid: string;
  pop_workband_id: number;
  workband_name: string;
  workband_order: number;
  days_from_sowing_start: number;
  days_from_sowing_end: number;
  description: string | null;
  workband_status: string;
  workband_start_date: string | null;
  workband_end_date: string | null;
  workband_completion_percentage: number;
  workband_notes: string | null;
  taskExecutions: TaskExec[];
}

interface TaskExec {
  id: number;
  execution_uuid: string;
  pop_task_id: number;
  task_name: string;
  task_description: string | null;
  task_status: string;
  task_completion_percentage: number;
  is_optional: boolean;
  estimated_labor_hours: number | null;
  task_start_date: string | null;
  task_end_date: string | null;
  task_notes: string | null;
  recommended_inputs: RecInput[];
}

interface RecInput {
  input_item_id: number;
  input_name: string;
  recommended_qty: number;
  unit: string;
}

interface Summary {
  expenses: any;
  income: any;
  profitability: any;
  harvests: any[];
}

interface Advisory {
  advisoryId: number;
  title: string | null;
  body: string;
  icon: string | null;
  urgency: string;
  acknowledged: boolean;
}

interface Compliance {
  overallComplianceScore: number | null;
  timingComplianceScore: number | null;
  quantityComplianceScore: number | null;
  costComplianceScore: number | null;
  practiceComplianceScore: number | null;
  dataCompletenessPct: number;
  completedStages: number;
  totalStages: number;
}

type CmsAction = "done" | "changed" | "skipped" | null;
const SKIP_REASONS = ["Cost / खर्चा", "Weather / मौसम", "Not needed / ज़रूरत नहीं", "Forgot / भूल गया", "Other / अन्य"];

const today = () => new Date().toISOString().split("T")[0];

const showAlert = (title: string, msg: string) => {
  Platform.OS === "web" ? window.alert(`${title}\n${msg}`) : Alert.alert(title, msg);
};

const fmtRupees = (v: number) =>
  `₹${v >= 100000 ? (v / 100000).toFixed(1) + "L" : v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;

const statusColor: Record<string, string> = {
  completed: "#2e7d32", in_progress: "#1565c0", delayed: "#e65100",
  skipped: "#888", planned: "#bbb", COMPLETED: "#2e7d32",
  IN_PROGRESS: "#1565c0", PLANNED: "#bbb",
};

// ─── Component ────────────────────────────────────────────────────

export default function CycleDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const cycleId = parseInt(params.id || "0", 10);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [workbands, setWorkbands] = useState<Workband[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [expandedWb, setExpandedWb] = useState<number | null>(null);

  // Active form state
  const [activeForm, setActiveForm] = useState<
    null | "task-input" | "harvest" | "sale"
  >(null);
  const [selectedTask, setSelectedTask] = useState<TaskExec | null>(null);

  // Task input form
  const [inputQty, setInputQty] = useState("");
  const [inputCost, setInputCost] = useState("");
  const [laborCount, setLaborCount] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [laborWage, setLaborWage] = useState("");
  const [laborType, setLaborType] = useState("hired_male");
  const [taskNotes, setTaskNotes] = useState("");

  // Harvest form
  const [harvestQty, setHarvestQty] = useState("");
  const [harvestGrade, setHarvestGrade] = useState("");

  // Sale form
  const [latestHarvestId, setLatestHarvestId] = useState<number | null>(null);
  const [saleQty, setSaleQty] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleBuyer, setSaleBuyer] = useState("");

  const [saving, setSaving] = useState(false);

  // CMS state
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [cmsWbId, setCmsWbId] = useState<number | null>(null);
  const [cmsAction, setCmsAction] = useState<CmsAction>(null);
  const [cmsEditData, setCmsEditData] = useState<Record<string, string>>({});
  const [skipReason, setSkipReason] = useState<string | null>(null);

  // ─── Load ───────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!cycleId) { setLoading(false); return; }
    try {
      const [cyclesRes, wbRes, sumRes, advRes, compRes] = await Promise.all([
        apiGet("/roots/cycles/me?includeClosed=true"),
        apiGet(`/roots/cycles/${cycleId}/workbands`).catch(() => null),
        apiGet(`/roots/cycles/${cycleId}/summary`).catch(() => null),
        apiGet(`/sage/feed/me?cycleId=${cycleId}`).catch(() => null),
        apiGet(`/roots/cycles/${cycleId}/compliance`).catch(() => null),
      ]);

      const all: Cycle[] = cyclesRes?.data?.cycles || [];
      setCycle(all.find((c) => c.cycleId === cycleId) || null);

      const wbs = wbRes?.data?.workbands || wbRes?.data || [];
      setWorkbands(wbs);

      const sumData = sumRes?.data || null;
      setSummary(sumData);

      // Extract latest harvest ID for sale form
      const harvests = sumData?.harvests || [];
      if (harvests.length > 0) {
        setLatestHarvestId(harvests[harvests.length - 1]?.id || harvests[harvests.length - 1]?.harvestRecordId || null);
      }

      const adv: Advisory[] = advRes?.data?.advisories || [];
      setAdvisories(adv.filter((a) => !a.acknowledged));

      // Compliance score
      if (compRes?.data) setCompliance(compRes.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [cycleId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  // ─── Actions ────────────────────────────────────────────────

  const startWorkband = async (wbId: number) => {
    setSaving(true);
    try {
      const r = await apiPost(`/roots/workbands/${wbId}/execute`, { startDate: today() });
      if (r?.success) { showAlert("Started", "Stage started"); load(); }
      else showAlert("Error", r?.message || "Could not start stage");
    } catch { showAlert("Error", "Could not start stage"); }
    finally { setSaving(false); }
  };

  const openTaskForm = (task: TaskExec) => {
    setSelectedTask(task);
    setActiveForm("task-input");
    setInputQty(""); setInputCost(""); setLaborCount(""); setLaborHours("");
    setLaborWage(""); setLaborType("hired_male"); setTaskNotes("");
  };

  const submitTaskExecution = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      const body: any = { startDate: today(), notes: taskNotes || undefined };

      // Build inputs array from recommended inputs + user-entered quantities
      const recInput = selectedTask.recommended_inputs?.[0];
      if (recInput && inputQty) {
        body.inputs = [{
          inputItemId: recInput.input_item_id,
          quantityUsed: parseFloat(inputQty),
          unitId: 1, // default unit
          cost: inputCost ? parseFloat(inputCost) : undefined,
        }];
      }

      // Labor
      if (laborCount && laborHours) {
        body.labor = [{
          laborType,
          laborCount: parseInt(laborCount, 10),
          laborHours: parseFloat(laborHours),
          wagePerDay: laborWage ? parseFloat(laborWage) : undefined,
        }];
      }

      const r = await apiPost(`/roots/tasks/${selectedTask.id}/execute`, body);
      if (r?.success) {
        showAlert("Logged", "Task data saved successfully");
        setActiveForm(null);
        setSelectedTask(null);
        load();
      } else {
        showAlert("Error", r?.message || "Could not log task data");
      }
    } catch (e: any) {
      showAlert("Error", e?.message || "Network error");
    } finally { setSaving(false); }
  };

  const completeTask = async (taskId: number) => {
    setSaving(true);
    try {
      const r = await apiPost(`/roots/tasks/${taskId}/complete`, {
        endDate: today(), completionPercentage: 100,
      });
      if (r?.success) { showAlert("Done", "Task completed"); load(); }
      else showAlert("Error", r?.message || "Could not complete task");
    } catch { showAlert("Error", "Could not complete task"); }
    finally { setSaving(false); }
  };

  const submitHarvest = async () => {
    const qty = parseFloat(harvestQty);
    if (!qty || qty <= 0) { showAlert("Error", "Enter valid quantity in kg"); return; }
    setSaving(true);
    try {
      const r = await apiPost(`/roots/cycles/${cycleId}/harvest`, {
        harvestStartDate: today(),
        totalQuantityKg: qty,
        qualityGrade: harvestGrade || undefined,
      });
      if (r?.success) {
        const newId = r.data?.harvestRecordId;
        if (newId) setLatestHarvestId(newId);
        showAlert("Recorded", `${qty} kg harvest recorded`);
        setActiveForm(null); setHarvestQty(""); setHarvestGrade("");
        load();
      } else showAlert("Error", r?.message || "Could not record harvest");
    } catch { showAlert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const submitSale = async () => {
    const qty = parseFloat(saleQty);
    const price = parseFloat(salePrice);
    if (!qty || qty <= 0) { showAlert("Error", "Enter quantity sold"); return; }
    if (!price || price <= 0) { showAlert("Error", "Enter price per kg"); return; }
    if (!latestHarvestId) { showAlert("Error", "Record a harvest first before logging sales"); return; }
    setSaving(true);
    try {
      const r = await apiPost(`/roots/harvest/${latestHarvestId}/sales`, {
        saleDate: today(),
        quantitySold: qty,
        pricePerKg: price,
        buyerName: saleBuyer || undefined,
      });
      if (r?.success) {
        showAlert("Recorded", `Sale of ${qty} kg at ₹${price}/kg recorded`);
        setActiveForm(null); setSaleQty(""); setSalePrice(""); setSaleBuyer("");
        load();
      } else showAlert("Error", r?.message || "Could not record sale");
    } catch { showAlert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const acknowledge = async (advisoryId: number) => {
    setAdvisories((prev) => prev.filter((a) => a.advisoryId !== advisoryId));
    try { await apiPost("/sage/feed/acknowledge", { advisoryId, actionTaken: true }); } catch {}
  };

  // ─── CMS Actions ───────────────────────────────────────────

  /** "Done" — auto-submit all tasks with PoP recommended values */
  const handleCmsDone = async (wb: Workband) => {
    setSaving(true);
    try {
      // Start workband if not already started
      if (wb.workband_status === "planned") {
        await apiPost(`/roots/workbands/${wb.id}/execute`, { startDate: today(), endDate: today() });
      }
      // Execute + complete each task with recommended values
      for (const task of wb.taskExecutions || []) {
        const tst = (task.task_status || "").toLowerCase();
        if (tst === "completed") continue;
        const body: any = { startDate: today(), notes: "CMS: confirmed as done" };
        if (task.recommended_inputs?.length) {
          body.inputs = task.recommended_inputs.map((inp) => ({
            inputItemId: inp.input_item_id,
            quantityUsed: inp.recommended_qty,
            unitId: 1,
            cost: undefined,
          }));
        }
        await apiPost(`/roots/tasks/${task.id}/execute`, body);
        await apiPost(`/roots/tasks/${task.id}/complete`, { endDate: today(), completionPercentage: 100 });
      }
      showAlert("Done ✅", `${wb.workband_name} marked as completed`);
      setCmsWbId(null); setCmsAction(null);
      load();
    } catch (e: any) {
      showAlert("Error", e?.message || "Could not save");
    } finally { setSaving(false); }
  };

  /** "Changed" — open pre-filled edit form */
  const openCmsEdit = (wb: Workband) => {
    setCmsWbId(wb.id);
    setCmsAction("changed");
    // Pre-fill from first task's recommended inputs
    const firstTask = wb.taskExecutions?.[0];
    const rec = firstTask?.recommended_inputs?.[0];
    setCmsEditData({
      inputQty: rec ? String(rec.recommended_qty) : "",
      inputCost: "",
      date: today(),
    });
  };

  /** Submit edited CMS values */
  const submitCmsEdit = async (wb: Workband) => {
    setSaving(true);
    try {
      if (wb.workband_status === "planned") {
        await apiPost(`/roots/workbands/${wb.id}/execute`, { startDate: cmsEditData.date || today() });
      }
      for (const task of wb.taskExecutions || []) {
        const tst = (task.task_status || "").toLowerCase();
        if (tst === "completed") continue;
        const body: any = { startDate: cmsEditData.date || today(), notes: "CMS: modified values" };
        const rec = task.recommended_inputs?.[0];
        if (rec && cmsEditData.inputQty) {
          body.inputs = [{
            inputItemId: rec.input_item_id,
            quantityUsed: parseFloat(cmsEditData.inputQty),
            unitId: 1,
            cost: cmsEditData.inputCost ? parseFloat(cmsEditData.inputCost) : undefined,
          }];
        }
        await apiPost(`/roots/tasks/${task.id}/execute`, body);
        await apiPost(`/roots/tasks/${task.id}/complete`, { endDate: cmsEditData.date || today(), completionPercentage: 100 });
      }
      showAlert("Saved ✏️", `${wb.workband_name} updated with your values`);
      setCmsWbId(null); setCmsAction(null); setCmsEditData({});
      load();
    } catch (e: any) {
      showAlert("Error", e?.message || "Could not save");
    } finally { setSaving(false); }
  };

  /** "Skipped" — mark with reason */
  const handleCmsSkip = async (wb: Workband) => {
    if (!skipReason) { showAlert("Select reason", "Please select why you skipped this stage"); return; }
    setSaving(true);
    try {
      await apiPost(`/roots/workbands/${wb.id}/execute`, {
        startDate: today(),
        endDate: today(),
        notes: `Skipped: ${skipReason}`,
      });
      showAlert("Skipped ⏭️", `${wb.workband_name} marked as skipped`);
      setCmsWbId(null); setCmsAction(null); setSkipReason(null);
      load();
    } catch (e: any) {
      showAlert("Error", e?.message || "Could not save");
    } finally { setSaving(false); }
  };

  /** Helper: determine visual status icon for a workband */
  const wbStatusIcon = (wb: Workband): string => {
    const st = (wb.workband_status || "").toLowerCase();
    if (st === "completed") {
      // Check if it was late
      if (cycle && cycle.sowingDate && wb.days_from_sowing_end) {
        const daysSince = Math.floor((Date.now() - new Date(cycle.sowingDate).getTime()) / 86400000);
        const completedDay = wb.workband_end_date
          ? Math.floor((new Date(wb.workband_end_date).getTime() - new Date(cycle.sowingDate).getTime()) / 86400000)
          : daysSince;
        if (completedDay > wb.days_from_sowing_end + 7) return "🟡";
      }
      return "✅";
    }
    if (st === "skipped") return "⏭️";
    if (st === "delayed") return "🔴";
    // Check if missed (window closed, no execution)
    if (st === "planned" && cycle?.sowingDate && wb.days_from_sowing_end) {
      const daysSince = Math.floor((Date.now() - new Date(cycle.sowingDate).getTime()) / 86400000);
      if (daysSince > wb.days_from_sowing_end + 14) return "🔴";
    }
    return "";
  };

  /** Helper: is this workband in its active window or overdue? */
  const isActionable = (wb: Workband): boolean => {
    const st = (wb.workband_status || "").toLowerCase();
    if (st === "completed" || st === "skipped") return false;
    if (st === "in_progress") return true;
    if (!cycle?.sowingDate || !wb.days_from_sowing_start) return false;
    const daysSince = Math.floor((Date.now() - new Date(cycle.sowingDate).getTime()) / 86400000);
    // Actionable if within window or overdue (up to 60 days past)
    return daysSince >= wb.days_from_sowing_start - 3 && daysSince <= (wb.days_from_sowing_end || wb.days_from_sowing_start) + 60;
  };

  // ─── Render ─────────────────────────────────────────────────

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#2e7d32" /></View>;
  }

  if (!cycle) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 16, color: "#666" }}>Cycle not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#1565c0", fontSize: 13, fontWeight: "700", marginTop: 10 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysSinceSowing = cycle.sowingDate
    ? Math.floor((Date.now() - new Date(cycle.sowingDate).getTime()) / 86400000)
    : null;

  // Find the current (in-progress) workband and next planned one
  const activeWb = workbands.find((w) => w.workband_status === "in_progress" || w.workband_status === "IN_PROGRESS");
  const nextWb = workbands.find((w) => w.workband_status === "planned" || w.workband_status === "PLANNED");

  // Financial summary
  const totalExp = Number(summary?.expenses?.total_expenses || 0) || (Number(summary?.expenses?.total_input_cost || 0) + Number(summary?.expenses?.total_labor_cost || 0) + Number(summary?.expenses?.total_machinery_cost || 0) + Number(summary?.expenses?.total_other_expenses || 0));
  const totalInc = Number(summary?.income?.total_sale_value || 0);
  const netProfit = totalInc - totalExp;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Header ── */}
      <Text style={s.title}>🌾 {cycle.varietyName || cycle.cropName || "Cycle"}</Text>
      <Text style={s.subtitle}>
        {cycle.cropName} · {cycle.season}
        {daysSinceSowing != null && ` · day ${daysSinceSowing}`}
        {cycle.fieldSizeHectares ? ` · ${cycle.fieldSizeHectares} ha` : ""}
      </Text>

      {/* ── Compliance Score Banner ── */}
      {compliance && compliance.overallComplianceScore !== null && (
        <View style={s.compBanner}>
          <View style={s.compScoreWrap}>
            <Text style={[s.compScore, { color: compliance.overallComplianceScore >= 70 ? "#2e7d32" : compliance.overallComplianceScore >= 40 ? "#e65100" : "#c62828" }]}>
              {Math.round(compliance.overallComplianceScore)}
            </Text>
            <Text style={s.compScoreLabel}>/ 100</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.compTitle}>Compliance Score / अनुपालन स्कोर</Text>
            <Text style={s.compDetail}>
              {compliance.completedStages}/{compliance.totalStages} stages · {compliance.dataCompletenessPct}% data
            </Text>
            <View style={s.compBarBg}>
              <View style={[s.compBarFill, { width: `${Math.min(compliance.overallComplianceScore, 100)}%` as any, backgroundColor: compliance.overallComplianceScore >= 70 ? "#2e7d32" : compliance.overallComplianceScore >= 40 ? "#e65100" : "#c62828" }]} />
            </View>
          </View>
        </View>
      )}

      {/* ── Current Stage Banner ── */}
      {activeWb && (
        <View style={s.activeBanner}>
          <Text style={s.activeBannerTitle}>📍 Current: {activeWb.workband_name}</Text>
          <Text style={s.activeBannerSub}>
            Day {activeWb.days_from_sowing_start}–{activeWb.days_from_sowing_end}
            {activeWb.description ? ` · ${activeWb.description}` : ""}
          </Text>
          <Text style={s.activeBannerTasks}>
            {activeWb.taskExecutions?.filter((t) => t.task_status === "completed" || t.task_status === "COMPLETED").length || 0}
            /{activeWb.taskExecutions?.length || 0} tasks done
          </Text>
        </View>
      )}
      {!activeWb && nextWb && (
        <TouchableOpacity
          style={s.startBanner}
          onPress={() => startWorkband(nextWb.id)}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={s.startBannerTitle}>▶ Start next stage: {nextWb.workband_name}</Text>
          <Text style={s.startBannerSub}>
            Day {nextWb.days_from_sowing_start}–{nextWb.days_from_sowing_end} · Tap to begin
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Quick Actions (4 real working buttons) ── */}
      <View style={s.quickRow}>
        <TouchableOpacity
          style={[s.quickBtn, !activeWb && { opacity: 0.4 }]}
          onPress={() => {
            if (!activeWb?.taskExecutions?.length) {
              showAlert("No tasks", "Start a stage first to log data");
              return;
            }
            const pendingTask = activeWb.taskExecutions.find(
              (t) => t.task_status !== "completed" && t.task_status !== "COMPLETED"
            ) || activeWb.taskExecutions[0];
            openTaskForm(pendingTask);
          }}
          disabled={!activeWb}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 22 }}>🧪</Text>
          <Text style={s.quickLabel}>Log input</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.quickBtn, !activeWb && { opacity: 0.4 }]}
          onPress={() => {
            if (!activeWb?.taskExecutions?.length) {
              showAlert("No tasks", "Start a stage first to log data");
              return;
            }
            const pendingTask = activeWb.taskExecutions.find(
              (t) => t.task_status !== "completed" && t.task_status !== "COMPLETED"
            ) || activeWb.taskExecutions[0];
            setSelectedTask(pendingTask);
            setActiveForm("task-input");
            setInputQty(""); setInputCost("");
            setLaborCount("2"); setLaborHours("8"); setLaborWage(""); setLaborType("hired_male");
            setTaskNotes("");
          }}
          disabled={!activeWb}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 22 }}>👨‍🌾</Text>
          <Text style={s.quickLabel}>Log labor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quickBtn}
          onPress={() => { setActiveForm("harvest"); setHarvestQty(""); setHarvestGrade(""); }}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 22 }}>🧺</Text>
          <Text style={s.quickLabel}>Harvest</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.quickBtn, !latestHarvestId && { opacity: 0.4 }]}
          onPress={() => {
            if (!latestHarvestId) { showAlert("No harvest", "Record a harvest first"); return; }
            setActiveForm("sale"); setSaleQty(""); setSalePrice(""); setSaleBuyer("");
          }}
          disabled={!latestHarvestId}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 22 }}>💰</Text>
          <Text style={s.quickLabel}>Sell</Text>
        </TouchableOpacity>
      </View>

      {/* ── Task Input/Labor Form ── */}
      {activeForm === "task-input" && selectedTask && (
        <View style={s.formCard}>
          <Text style={s.formTitle}>
            📝 Log data for: {selectedTask.task_name}
          </Text>
          {selectedTask.task_description && (
            <Text style={s.formDesc}>{selectedTask.task_description}</Text>
          )}

          {/* Recommended inputs */}
          {selectedTask.recommended_inputs?.length > 0 && (
            <View style={s.recBox}>
              <Text style={s.recTitle}>Recommended:</Text>
              {selectedTask.recommended_inputs.map((inp, i) => (
                <Text key={i} style={s.recItem}>
                  🧪 {inp.input_name}: {inp.recommended_qty} {inp.unit}
                </Text>
              ))}
            </View>
          )}

          <Text style={s.fieldLabel}>Input quantity used</Text>
          <TextInput style={s.input} value={inputQty} onChangeText={setInputQty}
            placeholder="e.g., 25 (kg)" keyboardType="numeric" placeholderTextColor="#999" />

          <Text style={s.fieldLabel}>Input cost (₹)</Text>
          <TextInput style={s.input} value={inputCost} onChangeText={setInputCost}
            placeholder="e.g., 850" keyboardType="numeric" placeholderTextColor="#999" />

          <View style={s.divider} />

          <Text style={s.fieldLabel}>Labor type</Text>
          <View style={s.chipRow}>
            {["family", "hired_male", "hired_female", "machine"].map((lt) => (
              <TouchableOpacity key={lt} style={[s.chip, laborType === lt && s.chipSel]}
                onPress={() => setLaborType(lt)}>
                <Text style={[s.chipText, laborType === lt && s.chipTextSel]}>
                  {lt.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Workers</Text>
              <TextInput style={s.input} value={laborCount} onChangeText={setLaborCount}
                placeholder="2" keyboardType="numeric" placeholderTextColor="#999" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Hours</Text>
              <TextInput style={s.input} value={laborHours} onChangeText={setLaborHours}
                placeholder="8" keyboardType="numeric" placeholderTextColor="#999" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Wage/day (₹)</Text>
              <TextInput style={s.input} value={laborWage} onChangeText={setLaborWage}
                placeholder="350" keyboardType="numeric" placeholderTextColor="#999" />
            </View>
          </View>

          <Text style={s.fieldLabel}>Notes</Text>
          <TextInput style={[s.input, { minHeight: 50 }]} value={taskNotes}
            onChangeText={setTaskNotes} placeholder="Optional" multiline placeholderTextColor="#999" />

          <View style={s.formBtnRow}>
            <TouchableOpacity style={s.formCancelBtn}
              onPress={() => { setActiveForm(null); setSelectedTask(null); }}>
              <Text style={s.formCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.formSubmitBtn, saving && { opacity: 0.6 }]}
              onPress={submitTaskExecution} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={s.formSubmitText}>Save entry</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Harvest Form ── */}
      {activeForm === "harvest" && (
        <View style={s.formCard}>
          <Text style={s.formTitle}>🧺 Record harvest</Text>
          <Text style={s.fieldLabel}>Total quantity (kg) *</Text>
          <TextInput style={s.input} value={harvestQty} onChangeText={setHarvestQty}
            placeholder="e.g., 2500" keyboardType="numeric" placeholderTextColor="#999" />
          <Text style={s.fieldLabel}>Quality grade (optional)</Text>
          <TextInput style={s.input} value={harvestGrade} onChangeText={setHarvestGrade}
            placeholder="A / B / C" placeholderTextColor="#999" />
          <View style={s.formBtnRow}>
            <TouchableOpacity style={s.formCancelBtn} onPress={() => setActiveForm(null)}>
              <Text style={s.formCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.formSubmitBtn, saving && { opacity: 0.6 }]}
              onPress={submitHarvest} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={s.formSubmitText}>Save harvest</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Sale Form ── */}
      {activeForm === "sale" && (
        <View style={s.formCard}>
          <Text style={s.formTitle}>💰 Record sale</Text>
          <Text style={s.fieldLabel}>Quantity sold (kg) *</Text>
          <TextInput style={s.input} value={saleQty} onChangeText={setSaleQty}
            placeholder="e.g., 1000" keyboardType="numeric" placeholderTextColor="#999" />
          <Text style={s.fieldLabel}>Price per kg (₹) *</Text>
          <TextInput style={s.input} value={salePrice} onChangeText={setSalePrice}
            placeholder="e.g., 22" keyboardType="numeric" placeholderTextColor="#999" />
          {saleQty && salePrice && (
            <Text style={s.calcPreview}>
              = {fmtRupees(parseFloat(saleQty || "0") * parseFloat(salePrice || "0"))} total
            </Text>
          )}
          <Text style={s.fieldLabel}>Buyer name (optional)</Text>
          <TextInput style={s.input} value={saleBuyer} onChangeText={setSaleBuyer}
            placeholder="e.g., Mandi trader" placeholderTextColor="#999" />
          <View style={s.formBtnRow}>
            <TouchableOpacity style={s.formCancelBtn} onPress={() => setActiveForm(null)}>
              <Text style={s.formCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.formSubmitBtn, saving && { opacity: 0.6 }]}
              onPress={submitSale} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={s.formSubmitText}>Save sale</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Financial Summary ── */}
      {(totalExp > 0 || totalInc > 0) && (
        <View style={s.finCard}>
          <Text style={s.finTitle}>📊 Financials</Text>
          <View style={s.finRow}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.finNum, { color: "#c62828" }]}>{fmtRupees(totalExp)}</Text>
              <Text style={s.finLabel}>Spent</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.finNum, { color: "#2e7d32" }]}>{fmtRupees(totalInc)}</Text>
              <Text style={s.finLabel}>Earned</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.finNum, { color: netProfit >= 0 ? "#2e7d32" : "#c62828" }]}>
                {fmtRupees(netProfit)}
              </Text>
              <Text style={s.finLabel}>Net</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Workband Timeline with CMS Cards ── */}
      {workbands.length > 0 && (
        <>
          <Text style={s.sectionTitle}>📋 Crop stages / फसल चरण</Text>
          {workbands.map((wb, i) => {
            const isExp = expandedWb === wb.id;
            const st = wb.workband_status?.toLowerCase();
            const isDone = st === "completed";
            const isActive = st === "in_progress";
            const tasks = wb.taskExecutions || [];
            const actionable = isActionable(wb);
            const icon = wbStatusIcon(wb);
            const isCmsTarget = cmsWbId === wb.id;

            return (
              <View key={wb.id}>
                <TouchableOpacity
                  style={[s.wbCard, isActive && s.wbCardActive, isDone && s.wbCardDone, actionable && !isDone && s.wbCardActionable]}
                  onPress={() => setExpandedWb(isExp ? null : wb.id)}
                  activeOpacity={0.85}
                >
                  <View style={s.wbTimeline}>
                    <View style={[s.wbDot, { backgroundColor: statusColor[st] || "#bbb" }]} />
                    {i < workbands.length - 1 && <View style={s.wbLine} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={s.wbName}>{icon ? `${icon} ` : ""}{wb.workband_name}</Text>
                      <Text style={[s.wbStatus, { color: statusColor[st] || "#bbb" }]}>
                        {isDone ? "Done" : isActive ? "Active" : st === "skipped" ? "Skipped" : st === "planned" ? "Upcoming" : st}
                      </Text>
                    </View>
                    <Text style={s.wbMeta}>
                      Day {wb.days_from_sowing_start}–{wb.days_from_sowing_end}
                      {tasks.length > 0 && ` · ${tasks.filter((t) => (t.task_status || "").toLowerCase() === "completed").length}/${tasks.length} tasks`}
                    </Text>

                    {/* PoP recommendation preview */}
                    {actionable && !isDone && tasks.length > 0 && (
                      <View style={s.cmsRecBox}>
                        {tasks.slice(0, 2).map((task) => (
                          <View key={task.id}>
                            <Text style={s.cmsRecLabel}>📋 {task.task_name}</Text>
                            {task.recommended_inputs?.map((inp, idx) => (
                              <Text key={idx} style={s.cmsRecItem}>
                                🧪 {inp.input_name}: {inp.recommended_qty} {inp.unit}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* ── CMS Action Buttons ── */}
                {actionable && !isDone && !isCmsTarget && (
                  <View style={s.cmsRow}>
                    <TouchableOpacity
                      style={[s.cmsBtn, s.cmsDoneBtn]}
                      onPress={() => handleCmsDone(wb)}
                      disabled={saving}
                      activeOpacity={0.7}
                    >
                      <Text style={s.cmsBtnText}>✅ Done</Text>
                      <Text style={s.cmsBtnHi}>हो गया</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.cmsBtn, s.cmsChangedBtn]}
                      onPress={() => openCmsEdit(wb)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.cmsBtnText}>✏️ Changed</Text>
                      <Text style={s.cmsBtnHi}>बदला</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.cmsBtn, s.cmsSkipBtn]}
                      onPress={() => { setCmsWbId(wb.id); setCmsAction("skipped"); setSkipReason(null); }}
                      activeOpacity={0.7}
                    >
                      <Text style={s.cmsBtnText}>⏭️ Skipped</Text>
                      <Text style={s.cmsBtnHi}>छोड़ा</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── CMS Edit Form (Changed) ── */}
                {isCmsTarget && cmsAction === "changed" && (
                  <View style={s.cmsEditCard}>
                    <Text style={s.cmsEditTitle}>✏️ Edit values / मान बदलें</Text>
                    {tasks[0]?.recommended_inputs?.[0] && (
                      <Text style={s.cmsEditRec}>
                        Recommended: {tasks[0].recommended_inputs[0].recommended_qty} {tasks[0].recommended_inputs[0].unit} of {tasks[0].recommended_inputs[0].input_name}
                      </Text>
                    )}
                    <Text style={s.fieldLabel}>Quantity used / उपयोग मात्रा</Text>
                    <TextInput
                      style={s.input}
                      value={cmsEditData.inputQty || ""}
                      onChangeText={(v) => setCmsEditData({ ...cmsEditData, inputQty: v })}
                      keyboardType="numeric"
                      placeholder="Quantity"
                      placeholderTextColor="#999"
                    />
                    <Text style={s.fieldLabel}>Cost (₹) / लागत</Text>
                    <TextInput
                      style={s.input}
                      value={cmsEditData.inputCost || ""}
                      onChangeText={(v) => setCmsEditData({ ...cmsEditData, inputCost: v })}
                      keyboardType="numeric"
                      placeholder="Cost in ₹"
                      placeholderTextColor="#999"
                    />
                    <View style={s.formBtnRow}>
                      <TouchableOpacity style={s.formCancelBtn} onPress={() => { setCmsWbId(null); setCmsAction(null); }}>
                        <Text style={s.formCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.formSubmitBtn, saving && { opacity: 0.6 }]}
                        onPress={() => submitCmsEdit(wb)}
                        disabled={saving}
                      >
                        {saving ? <ActivityIndicator color="#fff" size="small" /> :
                          <Text style={s.formSubmitText}>Save / सहेजें</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── CMS Skip Reason Picker ── */}
                {isCmsTarget && cmsAction === "skipped" && (
                  <View style={s.cmsSkipCard}>
                    <Text style={s.cmsSkipTitle}>⏭️ Why skipped? / क्यों छोड़ा?</Text>
                    <View style={s.chipRow}>
                      {SKIP_REASONS.map((reason) => (
                        <TouchableOpacity
                          key={reason}
                          style={[s.chip, skipReason === reason && s.chipSel]}
                          onPress={() => setSkipReason(reason)}
                        >
                          <Text style={[s.chipText, skipReason === reason && s.chipTextSel]}>{reason}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={s.formBtnRow}>
                      <TouchableOpacity style={s.formCancelBtn} onPress={() => { setCmsWbId(null); setCmsAction(null); }}>
                        <Text style={s.formCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.formSubmitBtn, saving && { opacity: 0.6 }]}
                        onPress={() => handleCmsSkip(wb)}
                        disabled={saving}
                      >
                        {saving ? <ActivityIndicator color="#fff" size="small" /> :
                          <Text style={s.formSubmitText}>Confirm skip</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── Legacy expanded task list (for completed/detailed view) ── */}
                {isExp && tasks.length > 0 && !isCmsTarget && (
                  <View style={s.taskList}>
                    {tasks.map((task) => {
                      const tst = (task.task_status || "").toLowerCase();
                      const tDone = tst === "completed";
                      return (
                        <View key={task.id} style={s.taskCard}>
                          <View style={s.taskHeader}>
                            <View style={[s.taskDot, { backgroundColor: statusColor[tst] || "#bbb" }]} />
                            <Text style={[s.taskName, tDone && { color: "#999", textDecorationLine: "line-through" }]}>
                              {task.task_name}{task.is_optional ? " (opt)" : ""}
                            </Text>
                            {!tDone && !actionable && (
                              <View style={{ flexDirection: "row", gap: 6 }}>
                                <TouchableOpacity style={s.taskLogBtn} onPress={() => openTaskForm(task)}>
                                  <Text style={s.taskLogText}>📝 Log</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.taskDoneBtn} onPress={() => completeTask(task.id)}>
                                  <Text style={s.taskDoneText}>✓</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                          {task.task_description && (
                            <Text style={s.taskDesc}>{task.task_description}</Text>
                          )}
                          {task.recommended_inputs?.length > 0 && (
                            <View style={s.recInputs}>
                              {task.recommended_inputs.map((inp, idx) => (
                                <Text key={idx} style={s.recInputItem}>
                                  🧪 {inp.input_name}: {inp.recommended_qty} {inp.unit}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* ── Advisories ── */}
      {advisories.length > 0 && (
        <>
          <Text style={s.sectionTitle}>🌱 Advisories</Text>
          {advisories.map((a) => (
            <View key={a.advisoryId} style={s.advCard}>
              <Text style={s.advTitle}>{a.icon || "🌾"} {a.title || "Advisory"}</Text>
              <Text style={s.advBody}>{a.body}</Text>
              <TouchableOpacity style={s.advBtn} onPress={() => acknowledge(a.advisoryId)}>
                <Text style={s.advBtnText}>Mark done</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* ── Support ── */}
      <Text style={s.sectionTitle}>💡 Support</Text>
      <TouchableOpacity style={s.promptCard}
        onPress={() => router.push(`/loan-apply?cycleId=${cycle.cycleId}` as any)} activeOpacity={0.85}>
        <Text style={{ fontSize: 22 }}>🏦</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.promptTitle}>Input loan for this cycle</Text>
          <Text style={s.promptDesc}>KCC-style up to ₹45,000/acre</Text>
        </View>
        <Text style={{ color: "#999" }}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.promptCard, { borderLeftColor: "#1565c0" }]}
        onPress={() => router.push(`/insurance?cycleId=${cycle.cycleId}` as any)} activeOpacity={0.85}>
        <Text style={{ fontSize: 22 }}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.promptTitle}>Insure this cycle</Text>
          <Text style={s.promptDesc}>PMFBY weather + pest coverage</Text>
        </View>
        <Text style={{ color: "#999" }}>→</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  title: { fontSize: 20, fontWeight: "800", color: "#1b5e20" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 12 },

  // Active stage banner
  activeBanner: {
    backgroundColor: "#e8f5e9", borderRadius: 14, padding: 14, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: "#2e7d32",
  },
  activeBannerTitle: { fontSize: 14, fontWeight: "800", color: "#1b5e20" },
  activeBannerSub: { fontSize: 12, color: "#555", marginTop: 2 },
  activeBannerTasks: { fontSize: 11, color: "#2e7d32", fontWeight: "700", marginTop: 4 },

  startBanner: {
    backgroundColor: "#fff3e0", borderRadius: 14, padding: 14, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: "#e65100",
  },
  startBannerTitle: { fontSize: 14, fontWeight: "800", color: "#e65100" },
  startBannerSub: { fontSize: 12, color: "#666", marginTop: 2 },

  // Quick actions
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickBtn: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  quickLabel: { fontSize: 10, fontWeight: "700", color: "#555", marginTop: 4 },

  // Forms
  formCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1.5, borderColor: "#2e7d32",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  formTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20", marginBottom: 4 },
  formDesc: { fontSize: 12, color: "#666", marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 12,
    fontSize: 15, backgroundColor: "#fafafa",
  },
  divider: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  chipText: { fontSize: 11, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#1b5e20" },
  formBtnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  formCancelBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center", backgroundColor: "#f5f5f5" },
  formCancelText: { fontSize: 13, fontWeight: "700", color: "#666" },
  formSubmitBtn: { flex: 2, borderRadius: 10, padding: 12, alignItems: "center", backgroundColor: "#2e7d32" },
  formSubmitText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  calcPreview: { fontSize: 14, fontWeight: "800", color: "#2e7d32", marginTop: 6 },

  recBox: { backgroundColor: "#f1f8e9", borderRadius: 8, padding: 10, marginTop: 8 },
  recTitle: { fontSize: 11, fontWeight: "700", color: "#558b2f", marginBottom: 4 },
  recItem: { fontSize: 12, color: "#33691e" },

  // Financial
  finCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  finTitle: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 10 },
  finRow: { flexDirection: "row" },
  finNum: { fontSize: 16, fontWeight: "800" },
  finLabel: { fontSize: 11, color: "#888", marginTop: 2 },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#333", marginTop: 16, marginBottom: 10 },

  // Workband timeline
  wbCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 2,
  },
  wbCardActive: { backgroundColor: "#e8f5e9", borderWidth: 1, borderColor: "#a5d6a7" },
  wbCardDone: { opacity: 0.6 },
  wbTimeline: { alignItems: "center", width: 18, paddingTop: 4 },
  wbDot: { width: 10, height: 10, borderRadius: 5 },
  wbLine: { width: 2, height: 20, backgroundColor: "#e0e0e0", marginTop: 4 },
  wbName: { fontSize: 13, fontWeight: "800", color: "#333", flex: 1 },
  wbStatus: { fontSize: 11, fontWeight: "700" },
  wbMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  wbStartBtn: { backgroundColor: "#2e7d32", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  wbStartText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  // Tasks
  taskList: { marginLeft: 28, marginBottom: 8 },
  taskCard: {
    backgroundColor: "#fafafa", borderRadius: 10, padding: 10, marginBottom: 4,
    borderLeftWidth: 3, borderLeftColor: "#e0e0e0",
  },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskName: { flex: 1, fontSize: 12, fontWeight: "700", color: "#333" },
  taskLogBtn: { backgroundColor: "#e3f2fd", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  taskLogText: { fontSize: 10, fontWeight: "800", color: "#1565c0" },
  taskDoneBtn: { backgroundColor: "#e8f5e9", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  taskDoneText: { fontSize: 12, fontWeight: "800", color: "#2e7d32" },
  taskDesc: { fontSize: 11, color: "#666", marginTop: 3, marginLeft: 14 },
  recInputs: { marginTop: 4, marginLeft: 14 },
  recInputItem: { fontSize: 11, color: "#558b2f" },

  // Advisories
  advCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  advTitle: { fontSize: 13, fontWeight: "800", color: "#222" },
  advBody: { fontSize: 12, color: "#555", marginTop: 4, lineHeight: 17 },
  advBtn: { backgroundColor: "#2e7d32", borderRadius: 8, padding: 8, alignItems: "center", marginTop: 8 },
  advBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Support prompts
  promptCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: "#2e7d32",
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  promptTitle: { fontSize: 13, fontWeight: "800", color: "#222" },
  promptDesc: { fontSize: 11, color: "#666", marginTop: 1 },

  // Compliance banner
  compBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: "#e0e0e0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  compScoreWrap: { alignItems: "center", width: 56 },
  compScore: { fontSize: 28, fontWeight: "800" },
  compScoreLabel: { fontSize: 10, color: "#999", fontWeight: "600" },
  compTitle: { fontSize: 13, fontWeight: "800", color: "#333" },
  compDetail: { fontSize: 11, color: "#888", marginTop: 2 },
  compBarBg: { height: 6, backgroundColor: "#e8e8e8", borderRadius: 3, marginTop: 6 },
  compBarFill: { height: 6, borderRadius: 3 },

  // CMS action buttons
  wbCardActionable: { borderWidth: 1.5, borderColor: "#a5d6a7" },
  cmsRecBox: { backgroundColor: "#f1f8e9", borderRadius: 8, padding: 8, marginTop: 8 },
  cmsRecLabel: { fontSize: 11, fontWeight: "700", color: "#558b2f" },
  cmsRecItem: { fontSize: 11, color: "#33691e", marginTop: 2 },

  cmsRow: { flexDirection: "row", gap: 8, marginLeft: 28, marginBottom: 10, marginTop: 4 },
  cmsBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", minHeight: 52 },
  cmsDoneBtn: { backgroundColor: "#e8f5e9", borderWidth: 1.5, borderColor: "#a5d6a7" },
  cmsChangedBtn: { backgroundColor: "#fff3e0", borderWidth: 1.5, borderColor: "#ffe0b2" },
  cmsSkipBtn: { backgroundColor: "#f5f5f5", borderWidth: 1.5, borderColor: "#e0e0e0" },
  cmsBtnText: { fontSize: 13, fontWeight: "800", color: "#333" },
  cmsBtnHi: { fontSize: 10, color: "#888", marginTop: 1 },

  // CMS edit card
  cmsEditCard: {
    marginLeft: 28, marginBottom: 10, backgroundColor: "#fff", borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: "#ffe0b2",
  },
  cmsEditTitle: { fontSize: 14, fontWeight: "800", color: "#e65100", marginBottom: 4 },
  cmsEditRec: { fontSize: 12, color: "#558b2f", backgroundColor: "#f1f8e9", borderRadius: 6, padding: 8, marginBottom: 8 },

  // CMS skip card
  cmsSkipCard: {
    marginLeft: 28, marginBottom: 10, backgroundColor: "#fff", borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: "#e0e0e0",
  },
  cmsSkipTitle: { fontSize: 14, fontWeight: "800", color: "#555", marginBottom: 8 },
});
