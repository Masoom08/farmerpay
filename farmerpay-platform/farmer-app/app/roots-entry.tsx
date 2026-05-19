import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiPost } from "../lib/api";
import VoiceInputButton from "../components/VoiceInputButton";

// ─── Types ─────────────────────────────────────────────────────────

type EntryType =
  | "dairy_milk"
  | "dairy_health"
  | "fishery_water"
  | "fishery_stock"
  | "horti_harvest"
  | "horti_health"
  | "horti_input"
  | "horti_irrigation"
  | "crop_task"
  | "pop_touchpoint";

interface FormConfig {
  title: string;
  titleHi: string;
  apiPath: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────

const FORM_CONFIGS: Record<EntryType, FormConfig> = {
  dairy_milk: {
    title: "Log Milk",
    titleHi: "दूध दर्ज करें",
    apiPath: "/roots/dairy/animals/1/health",
  },
  dairy_health: {
    title: "Animal Health Check",
    titleHi: "पशु स्वास्थ्य जांच",
    apiPath: "/roots/dairy/animals/1/health",
  },
  fishery_water: {
    title: "Water Quality Test",
    titleHi: "पानी गुणवत्ता परीक्षण",
    apiPath: null, // collect-only for now
  },
  fishery_stock: {
    title: "Species Stocking",
    titleHi: "मछली भंडारण",
    apiPath: "/roots/fishery/pond/1/stocking",
  },
  horti_harvest: {
    title: "Harvest Log",
    titleHi: "फसल कटाई दर्ज",
    apiPath: "/roots/horticulture/orchards/1/harvests",
  },
  horti_health: {
    title: "Orchard Health",
    titleHi: "बागान स्वास्थ्य",
    apiPath: "/roots/horticulture/orchards/1/health",
  },
  horti_input: {
    title: "Input Application",
    titleHi: "इनपुट प्रयोग",
    apiPath: "/roots/horticulture/orchards/1/inputs",
  },
  horti_irrigation: {
    title: "Irrigation Log",
    titleHi: "सिंचाई दर्ज",
    apiPath: "/roots/horticulture/orchards/1/irrigation",
  },
  crop_task: {
    title: "Crop Task Entry",
    titleHi: "फसल कार्य दर्ज",
    apiPath: null, // needs workband/task IDs
  },
  pop_touchpoint: {
    // Title is overridden at runtime with the touchpoint name from route params.
    title: "Log Touchpoint",
    titleHi: "चरण दर्ज करें",
    // apiPath is built at runtime from the activityCode route param —
    // see handleSave() special-case for pop_touchpoint.
    apiPath: null,
  },
};

const TODAY = new Date().toISOString().split("T")[0];

// ─── Helper Components ─────────────────────────────────────────────

function FieldLabel({ label, labelHi }: { label: string; labelHi: string }) {
  return (
    <Text style={s.fieldLabel}>
      {label} / <Text style={s.fieldLabelHi}>{labelHi}</Text>
    </Text>
  );
}

function NumberInput({
  value,
  onChangeText,
  placeholder,
  step,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      placeholderTextColor="#999"
    />
  );
}

function DropdownSelect({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.dropdownRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[s.dropdownChip, value === opt.value && s.dropdownChipActive]}
          onPress={() => onChange(opt.value)}
        >
          <Text
            style={[
              s.dropdownChipText,
              value === opt.value && s.dropdownChipTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CheckboxField({
  label,
  labelHi,
  value,
  onChange,
}: {
  label: string;
  labelHi: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.checkboxRow}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#ccc", true: "#81c784" }}
        thumbColor={value ? "#2e7d32" : "#f4f3f4"}
      />
      <Text style={s.checkboxLabel}>
        {label} / <Text style={s.fieldLabelHi}>{labelHi}</Text>
      </Text>
    </View>
  );
}

// ─── Form Renderers ────────────────────────────────────────────────

function DairyMilkForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Date" labelHi="तारीख" />
      <TextInput
        style={s.input}
        value={data.date}
        onChangeText={(v) => set("date", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Morning Liters" labelHi="सुबह लीटर" />
      <NumberInput
        value={data.morningLiters}
        onChangeText={(v) => set("morningLiters", v)}
        placeholder="e.g. 5.5"
      />

      <FieldLabel label="Evening Liters" labelHi="शाम लीटर" />
      <NumberInput
        value={data.eveningLiters}
        onChangeText={(v) => set("eveningLiters", v)}
        placeholder="e.g. 4.0"
      />

      <FieldLabel label="Milk Sold (liters)" labelHi="बेचा दूध (लीटर)" />
      <NumberInput
        value={data.milkSold}
        onChangeText={(v) => set("milkSold", v)}
        placeholder="e.g. 8.0"
      />

      <FieldLabel label="Price per Liter" labelHi="प्रति लीटर मूल्य" />
      <NumberInput
        value={data.pricePerLiter}
        onChangeText={(v) => set("pricePerLiter", v)}
        placeholder="e.g. 35"
      />

      <FieldLabel label="Buyer Name" labelHi="खरीदार का नाम" />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={data.buyerName}
          onChangeText={(v) => set("buyerName", v)}
          placeholder="Buyer name"
          placeholderTextColor="#999"
        />
        <VoiceInputButton onResult={(v) => set("buyerName", v)} language="hi" />
      </View>

      <FieldLabel label="Notes" labelHi="टिप्पणी" />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          style={[s.input, s.textArea, { flex: 1 }]}
          value={data.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder="Any notes..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
        <VoiceInputButton onResult={(v) => set("notes", v)} language="hi" />
      </View>
    </>
  );
}

function DairyHealthForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Date" labelHi="तारीख" />
      <TextInput
        style={s.input}
        value={data.date}
        onChangeText={(v) => set("date", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Weight (kg)" labelHi="वजन (किलो)" />
      <NumberInput
        value={data.weight}
        onChangeText={(v) => set("weight", v)}
        placeholder="e.g. 350"
      />

      <FieldLabel label="Milk Production (liters)" labelHi="दूध उत्पादन (लीटर)" />
      <NumberInput
        value={data.milkProduction}
        onChangeText={(v) => set("milkProduction", v)}
        placeholder="e.g. 10"
      />

      <FieldLabel label="Milk Quality" labelHi="दूध गुणवत्ता" />
      <DropdownSelect
        options={[
          { label: "Excellent", value: "excellent" },
          { label: "Good", value: "good" },
          { label: "Average", value: "average" },
          { label: "Poor", value: "poor" },
        ]}
        value={data.milkQuality}
        onChange={(v) => set("milkQuality", v)}
      />

      <FieldLabel label="Health Status" labelHi="स्वास्थ्य स्थिति" />
      <TextInput
        style={s.input}
        value={data.healthStatus}
        onChangeText={(v) => set("healthStatus", v)}
        placeholder="e.g. Healthy, Weak..."
        placeholderTextColor="#999"
      />

      <CheckboxField
        label="Vaccinations Done"
        labelHi="टीकाकरण हुआ"
        value={data.vaccinationsDone}
        onChange={(v) => set("vaccinationsDone", v)}
      />

      <CheckboxField
        label="Disease Detected"
        labelHi="बीमारी पाई गई"
        value={data.diseaseDetected}
        onChange={(v) => set("diseaseDetected", v)}
      />

      {data.diseaseDetected && (
        <>
          <FieldLabel label="Disease Name" labelHi="बीमारी का नाम" />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={data.diseaseName}
              onChangeText={(v) => set("diseaseName", v)}
              placeholder="Disease name"
              placeholderTextColor="#999"
            />
            <VoiceInputButton onResult={(v) => set("diseaseName", v)} language="hi" />
          </View>
        </>
      )}

      <FieldLabel label="Treatment Given" labelHi="उपचार दिया गया" />
      <TextInput
        style={[s.input, s.textArea]}
        value={data.treatmentGiven}
        onChangeText={(v) => set("treatmentGiven", v)}
        placeholder="Treatment details..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
      />
    </>
  );
}

function FisheryWaterForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Date" labelHi="तारीख" />
      <TextInput
        style={s.input}
        value={data.date}
        onChangeText={(v) => set("date", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="pH Level (0-14)" labelHi="पीएच स्तर (0-14)" />
      <NumberInput
        value={data.ph}
        onChangeText={(v) => set("ph", v)}
        placeholder="e.g. 7.2"
        step={0.1}
      />

      <FieldLabel label="Dissolved Oxygen (ppm)" labelHi="घुलित ऑक्सीजन (पीपीएम)" />
      <NumberInput
        value={data.dissolvedOxygen}
        onChangeText={(v) => set("dissolvedOxygen", v)}
        placeholder="e.g. 6.5"
      />

      <FieldLabel label="Ammonia (ppm)" labelHi="अमोनिया (पीपीएम)" />
      <NumberInput
        value={data.ammonia}
        onChangeText={(v) => set("ammonia", v)}
        placeholder="e.g. 0.02"
      />

      <FieldLabel label="Temperature (°C)" labelHi="तापमान (°C)" />
      <NumberInput
        value={data.temperature}
        onChangeText={(v) => set("temperature", v)}
        placeholder="e.g. 28"
      />

      <FieldLabel label="Turbidity (cm)" labelHi="मटमैलापन (सेमी)" />
      <NumberInput
        value={data.turbidity}
        onChangeText={(v) => set("turbidity", v)}
        placeholder="e.g. 30"
      />

      <FieldLabel label="Action Taken" labelHi="कार्रवाई की गई" />
      <TextInput
        style={[s.input, s.textArea]}
        value={data.actionTaken}
        onChangeText={(v) => set("actionTaken", v)}
        placeholder="Any corrective action..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
      />
    </>
  );
}

function FisheryStockForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Species Name" labelHi="प्रजाति का नाम" />
      <TextInput
        style={s.input}
        value={data.speciesName}
        onChangeText={(v) => set("speciesName", v)}
        placeholder="e.g. Rohu, Katla..."
        placeholderTextColor="#999"
      />

      <FieldLabel label="Species Type" labelHi="प्रजाति प्रकार" />
      <DropdownSelect
        options={[
          { label: "Carp", value: "carp" },
          { label: "Catfish", value: "catfish" },
          { label: "Tilapia", value: "tilapia" },
          { label: "Shrimp", value: "shrimp" },
          { label: "Other", value: "other" },
        ]}
        value={data.speciesType}
        onChange={(v) => set("speciesType", v)}
      />

      <FieldLabel label="Stocking Date" labelHi="भंडारण तारीख" />
      <TextInput
        style={s.input}
        value={data.stockingDate}
        onChangeText={(v) => set("stockingDate", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Fingerlings Count" labelHi="फिंगरलिंग संख्या" />
      <NumberInput
        value={data.fingerlingsCount}
        onChangeText={(v) => set("fingerlingsCount", v)}
        placeholder="e.g. 5000"
      />

      <FieldLabel label="Cost per Unit" labelHi="प्रति इकाई लागत" />
      <NumberInput
        value={data.costPerUnit}
        onChangeText={(v) => set("costPerUnit", v)}
        placeholder="e.g. 2.5"
      />

      <FieldLabel label="Expected Survival Rate (%)" labelHi="अपेक्षित जीवित दर (%)" />
      <NumberInput
        value={data.survivalRate}
        onChangeText={(v) => set("survivalRate", v)}
        placeholder="e.g. 85"
      />
    </>
  );
}

function HortiHarvestForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Harvest Date" labelHi="कटाई तारीख" />
      <TextInput
        style={s.input}
        value={data.harvestDate}
        onChangeText={(v) => set("harvestDate", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Total Yield (kg)" labelHi="कुल उपज (किलो)" />
      <NumberInput
        value={data.totalYield}
        onChangeText={(v) => set("totalYield", v)}
        placeholder="e.g. 500"
      />

      <View style={s.gradeSection}>
        <Text style={s.gradeSectionTitle}>
          Grading / ग्रेडिंग
        </Text>

        <FieldLabel label="Grade A (kg)" labelHi="ग्रेड ए (किलो)" />
        <NumberInput
          value={data.gradeA}
          onChangeText={(v) => set("gradeA", v)}
          placeholder="0"
        />

        <FieldLabel label="Grade B (kg)" labelHi="ग्रेड बी (किलो)" />
        <NumberInput
          value={data.gradeB}
          onChangeText={(v) => set("gradeB", v)}
          placeholder="0"
        />

        <FieldLabel label="Grade C (kg)" labelHi="ग्रेड सी (किलो)" />
        <NumberInput
          value={data.gradeC}
          onChangeText={(v) => set("gradeC", v)}
          placeholder="0"
        />

        <FieldLabel label="Rejection (kg)" labelHi="अस्वीकृत (किलो)" />
        <NumberInput
          value={data.rejection}
          onChangeText={(v) => set("rejection", v)}
          placeholder="0"
        />
      </View>

      <FieldLabel label="Rejection Reason" labelHi="अस्वीकृति कारण" />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={data.rejectionReason}
          onChangeText={(v) => set("rejectionReason", v)}
          placeholder="Reason for rejection..."
          placeholderTextColor="#999"
        />
        <VoiceInputButton onResult={(v) => set("rejectionReason", v)} language="hi" />
      </View>

      <FieldLabel label="Sale Quantity (kg)" labelHi="बिक्री मात्रा (किलो)" />
      <NumberInput
        value={data.saleQuantity}
        onChangeText={(v) => set("saleQuantity", v)}
        placeholder="e.g. 450"
      />

      <FieldLabel label="Sale Price per kg" labelHi="बिक्री मूल्य प्रति किलो" />
      <NumberInput
        value={data.salePricePerKg}
        onChangeText={(v) => set("salePricePerKg", v)}
        placeholder="e.g. 40"
      />

      <FieldLabel label="Buyer Name" labelHi="खरीदार का नाम" />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={data.buyerName}
          onChangeText={(v) => set("buyerName", v)}
          placeholder="Buyer name"
          placeholderTextColor="#999"
        />
        <VoiceInputButton onResult={(v) => set("buyerName", v)} language="hi" />
      </View>

      <FieldLabel label="Buyer Type" labelHi="खरीदार प्रकार" />
      <DropdownSelect
        options={[
          { label: "Mandi", value: "mandi" },
          { label: "Processor", value: "processor" },
          { label: "Exporter", value: "exporter" },
          { label: "Retail", value: "retail" },
          { label: "FPO", value: "fpo" },
        ]}
        value={data.buyerType}
        onChange={(v) => set("buyerType", v)}
      />
    </>
  );
}

function HortiHealthForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Observation Date" labelHi="अवलोकन तारीख" />
      <TextInput
        style={s.input}
        value={data.observationDate}
        onChangeText={(v) => set("observationDate", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Health Status" labelHi="स्वास्थ्य स्थिति" />
      <DropdownSelect
        options={[
          { label: "Excellent", value: "excellent" },
          { label: "Good", value: "good" },
          { label: "Average", value: "average" },
          { label: "Poor", value: "poor" },
        ]}
        value={data.healthStatus}
        onChange={(v) => set("healthStatus", v)}
      />

      <CheckboxField
        label="Pest Detected"
        labelHi="कीट पाया गया"
        value={data.pestDetected}
        onChange={(v) => set("pestDetected", v)}
      />

      {data.pestDetected && (
        <>
          <FieldLabel label="Pest Name" labelHi="कीट का नाम" />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={data.pestName}
              onChangeText={(v) => set("pestName", v)}
              placeholder="Pest name"
              placeholderTextColor="#999"
            />
            <VoiceInputButton onResult={(v) => set("pestName", v)} language="hi" />
          </View>
        </>
      )}

      <CheckboxField
        label="Disease Detected"
        labelHi="बीमारी पाई गई"
        value={data.diseaseDetected}
        onChange={(v) => set("diseaseDetected", v)}
      />

      {data.diseaseDetected && (
        <>
          <FieldLabel label="Disease Name" labelHi="बीमारी का नाम" />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={data.diseaseName}
              onChangeText={(v) => set("diseaseName", v)}
              placeholder="Disease name"
              placeholderTextColor="#999"
            />
            <VoiceInputButton onResult={(v) => set("diseaseName", v)} language="hi" />
          </View>
        </>
      )}

      <FieldLabel label="Affected Plant Count" labelHi="प्रभावित पौधे संख्या" />
      <NumberInput
        value={data.affectedPlantCount}
        onChangeText={(v) => set("affectedPlantCount", v)}
        placeholder="e.g. 12"
      />

      <FieldLabel label="Treatment Given" labelHi="उपचार दिया गया" />
      <TextInput
        style={[s.input, s.textArea]}
        value={data.treatmentGiven}
        onChangeText={(v) => set("treatmentGiven", v)}
        placeholder="Treatment details..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
      />
    </>
  );
}

function HortiInputForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Input Date" labelHi="इनपुट तारीख" />
      <TextInput
        style={s.input}
        value={data.inputDate}
        onChangeText={(v) => set("inputDate", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Input Type" labelHi="इनपुट प्रकार" />
      <DropdownSelect
        options={[
          { label: "Fertilizer", value: "fertilizer" },
          { label: "Pesticide", value: "pesticide" },
          { label: "Herbicide", value: "herbicide" },
          { label: "Fungicide", value: "fungicide" },
          { label: "Growth Regulator", value: "growth_regulator" },
        ]}
        value={data.inputType}
        onChange={(v) => set("inputType", v)}
      />

      <FieldLabel label="Input Name" labelHi="इनपुट का नाम" />
      <TextInput
        style={s.input}
        value={data.inputName}
        onChangeText={(v) => set("inputName", v)}
        placeholder="e.g. DAP, Urea..."
        placeholderTextColor="#999"
      />

      <FieldLabel label="Quantity" labelHi="मात्रा" />
      <NumberInput
        value={data.quantity}
        onChangeText={(v) => set("quantity", v)}
        placeholder="e.g. 25"
      />

      <FieldLabel label="Unit" labelHi="इकाई" />
      <DropdownSelect
        options={[
          { label: "kg", value: "kg" },
          { label: "L", value: "l" },
          { label: "mL", value: "ml" },
          { label: "g", value: "g" },
        ]}
        value={data.unit}
        onChange={(v) => set("unit", v)}
      />

      <FieldLabel label="Cost (Rs)" labelHi="लागत (रु)" />
      <NumberInput
        value={data.cost}
        onChangeText={(v) => set("cost", v)}
        placeholder="e.g. 1200"
      />
    </>
  );
}

function HortiIrrigationForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Irrigation Date" labelHi="सिंचाई तारीख" />
      <TextInput
        style={s.input}
        value={data.irrigationDate}
        onChangeText={(v) => set("irrigationDate", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Method" labelHi="विधि" />
      <DropdownSelect
        options={[
          { label: "Drip", value: "drip" },
          { label: "Sprinkler", value: "sprinkler" },
          { label: "Flood", value: "flood" },
          { label: "Furrow", value: "furrow" },
          { label: "Manual", value: "manual" },
        ]}
        value={data.method}
        onChange={(v) => set("method", v)}
      />

      <FieldLabel label="Duration (hours)" labelHi="अवधि (घंटे)" />
      <NumberInput
        value={data.durationHours}
        onChangeText={(v) => set("durationHours", v)}
        placeholder="e.g. 2.5"
      />

      <FieldLabel label="Water Source" labelHi="जल स्रोत" />
      <TextInput
        style={s.input}
        value={data.waterSource}
        onChangeText={(v) => set("waterSource", v)}
        placeholder="e.g. Borewell, Canal..."
        placeholderTextColor="#999"
      />

      <FieldLabel label="Cost (Rs)" labelHi="लागत (रु)" />
      <NumberInput
        value={data.cost}
        onChangeText={(v) => set("cost", v)}
        placeholder="e.g. 500"
      />
    </>
  );
}

function CropTaskForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <FieldLabel label="Notes" labelHi="टिप्पणी" />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          style={[s.input, s.textArea, { flex: 1 }]}
          value={data.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder="Task notes..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
        <VoiceInputButton onResult={(v) => set("notes", v)} language="hi" />
      </View>

      <FieldLabel label="Inputs Used" labelHi="उपयोग किए गए इनपुट" />
      <TextInput
        style={s.input}
        value={data.inputsUsed}
        onChangeText={(v) => set("inputsUsed", v)}
        placeholder="e.g. DAP 25kg, Urea 10kg"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Labor Hours" labelHi="श्रम घंटे" />
      <NumberInput
        value={data.laborHours}
        onChangeText={(v) => set("laborHours", v)}
        placeholder="e.g. 6"
      />

      <FieldLabel label="Labor Type" labelHi="श्रम प्रकार" />
      <DropdownSelect
        options={[
          { label: "Family", value: "family" },
          { label: "Hired Male", value: "hired_male" },
          { label: "Hired Female", value: "hired_female" },
          { label: "Machine", value: "machine" },
        ]}
        value={data.laborType}
        onChange={(v) => set("laborType", v)}
      />

      <FieldLabel label="Labor Cost (Rs)" labelHi="श्रम लागत (रु)" />
      <NumberInput
        value={data.laborCost}
        onChangeText={(v) => set("laborCost", v)}
        placeholder="e.g. 500"
      />

      <FieldLabel label="Machinery Type" labelHi="मशीनरी प्रकार" />
      <TextInput
        style={s.input}
        value={data.machineryType}
        onChangeText={(v) => set("machineryType", v)}
        placeholder="e.g. Tractor, Rotavator..."
        placeholderTextColor="#999"
      />

      <FieldLabel label="Machinery Cost (Rs)" labelHi="मशीनरी लागत (रु)" />
      <NumberInput
        value={data.machineryCost}
        onChangeText={(v) => set("machineryCost", v)}
        placeholder="e.g. 2000"
      />
    </>
  );
}

/**
 * PoP Touchpoint form — captures the four signals the backend uses to score
 * a touchpoint: did the task happen, was it on time, were inputs applied per
 * the PoP, and what did it actually cost. Plus free-form notes.
 *
 * Score is derived from these in handleSave before the POST so the farmer
 * never has to think about a 0–100 number.
 */
function PopTouchpointForm({
  data,
  set,
}: {
  data: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <View style={s.checkboxRow}>
        <Switch
          value={!!data.taskCompleted}
          onValueChange={(v) => set("taskCompleted", v)}
          trackColor={{ false: "#ccc", true: "#81c784" }}
          thumbColor={data.taskCompleted ? "#2e7d32" : "#f4f3f4"}
        />
        <Text style={s.checkboxLabel}>Task completed / कार्य पूर्ण</Text>
      </View>

      <FieldLabel label="Timing" labelHi="समय" />
      <DropdownSelect
        options={[
          { label: "On time", value: "ON_TIME" },
          { label: "Delayed", value: "DELAYED" },
          { label: "Early", value: "EARLY" },
        ]}
        value={data.timingStatus}
        onChange={(v) => set("timingStatus", v)}
      />

      <FieldLabel label="Inputs used" labelHi="उपयोग किए गए इनपुट" />
      <DropdownSelect
        options={[
          { label: "As per PoP", value: "AS_PER_POP" },
          { label: "Deviation", value: "DEVIATION" },
          { label: "Not recorded", value: "NOT_RECORDED" },
        ]}
        value={data.inputsStatus}
        onChange={(v) => set("inputsStatus", v)}
      />

      <FieldLabel label="Actual cost (Rs)" labelHi="वास्तविक लागत (रु)" />
      <NumberInput
        value={data.actualCostInr}
        onChangeText={(v) => set("actualCostInr", v)}
        placeholder="e.g. 1500"
      />

      <FieldLabel label="Notes" labelHi="टिप्पणी" />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          style={[s.input, s.textArea, { flex: 1 }]}
          value={data.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder="Anything else to note..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
        <VoiceInputButton onResult={(v) => set("notes", v)} language="hi" />
      </View>
    </>
  );
}

// ─── Initial State Builders ────────────────────────────────────────

function getInitialState(type: EntryType): Record<string, any> {
  switch (type) {
    case "dairy_milk":
      return {
        date: TODAY,
        morningLiters: "",
        eveningLiters: "",
        milkSold: "",
        pricePerLiter: "",
        buyerName: "",
        notes: "",
      };
    case "dairy_health":
      return {
        date: TODAY,
        weight: "",
        milkProduction: "",
        milkQuality: "good",
        healthStatus: "",
        vaccinationsDone: false,
        diseaseDetected: false,
        diseaseName: "",
        treatmentGiven: "",
      };
    case "fishery_water":
      return {
        date: TODAY,
        ph: "",
        dissolvedOxygen: "",
        ammonia: "",
        temperature: "",
        turbidity: "",
        actionTaken: "",
      };
    case "fishery_stock":
      return {
        speciesName: "",
        speciesType: "carp",
        stockingDate: TODAY,
        fingerlingsCount: "",
        costPerUnit: "",
        survivalRate: "",
      };
    case "horti_harvest":
      return {
        harvestDate: TODAY,
        totalYield: "",
        gradeA: "",
        gradeB: "",
        gradeC: "",
        rejection: "",
        rejectionReason: "",
        saleQuantity: "",
        salePricePerKg: "",
        buyerName: "",
        buyerType: "mandi",
      };
    case "horti_health":
      return {
        observationDate: TODAY,
        healthStatus: "good",
        pestDetected: false,
        pestName: "",
        diseaseDetected: false,
        diseaseName: "",
        affectedPlantCount: "",
        treatmentGiven: "",
      };
    case "horti_input":
      return {
        inputDate: TODAY,
        inputType: "fertilizer",
        inputName: "",
        quantity: "",
        unit: "kg",
        cost: "",
      };
    case "horti_irrigation":
      return {
        irrigationDate: TODAY,
        method: "drip",
        durationHours: "",
        waterSource: "",
        cost: "",
      };
    case "crop_task":
      return {
        notes: "",
        inputsUsed: "",
        laborHours: "",
        laborType: "family",
        laborCost: "",
        machineryType: "",
        machineryCost: "",
      };
    case "pop_touchpoint":
      return {
        taskCompleted: true,
        timingStatus: "ON_TIME",
        inputsStatus: "AS_PER_POP",
        actualCostInr: "",
        notes: "",
      };
    default:
      return {};
  }
}

// ─── Payload Builders ──────────────────────────────────────────────

function buildPayload(type: EntryType, data: Record<string, any>): Record<string, any> {
  const num = (v: string) => (v ? parseFloat(v) : undefined);
  const int = (v: string) => (v ? parseInt(v, 10) : undefined);

  switch (type) {
    case "dairy_milk":
      return {
        date: data.date,
        morningLiters: num(data.morningLiters),
        eveningLiters: num(data.eveningLiters),
        milkSold: num(data.milkSold),
        pricePerLiter: num(data.pricePerLiter),
        buyerName: data.buyerName || undefined,
        notes: data.notes || undefined,
      };
    case "dairy_health":
      return {
        date: data.date,
        weight: num(data.weight),
        milkProduction: num(data.milkProduction),
        milkQuality: data.milkQuality,
        healthStatus: data.healthStatus || undefined,
        vaccinationsDone: data.vaccinationsDone,
        diseaseDetected: data.diseaseDetected,
        diseaseName: data.diseaseDetected ? data.diseaseName : undefined,
        treatmentGiven: data.treatmentGiven || undefined,
      };
    case "fishery_water":
      return {
        date: data.date,
        ph: num(data.ph),
        dissolvedOxygen: num(data.dissolvedOxygen),
        ammonia: num(data.ammonia),
        temperature: num(data.temperature),
        turbidity: num(data.turbidity),
        actionTaken: data.actionTaken || undefined,
      };
    case "fishery_stock":
      return {
        speciesName: data.speciesName,
        speciesType: data.speciesType,
        stockingDate: data.stockingDate,
        fingerlingsCount: int(data.fingerlingsCount),
        costPerUnit: num(data.costPerUnit),
        expectedSurvivalRate: num(data.survivalRate),
      };
    case "horti_harvest":
      return {
        harvestDate: data.harvestDate,
        totalYield: num(data.totalYield),
        gradeA: num(data.gradeA),
        gradeB: num(data.gradeB),
        gradeC: num(data.gradeC),
        rejection: num(data.rejection),
        rejectionReason: data.rejectionReason || undefined,
        saleQuantity: num(data.saleQuantity),
        salePricePerKg: num(data.salePricePerKg),
        buyerName: data.buyerName || undefined,
        buyerType: data.buyerType,
      };
    case "horti_health":
      return {
        observationDate: data.observationDate,
        healthStatus: data.healthStatus,
        pestDetected: data.pestDetected,
        pestName: data.pestDetected ? data.pestName : undefined,
        diseaseDetected: data.diseaseDetected,
        diseaseName: data.diseaseDetected ? data.diseaseName : undefined,
        affectedPlantCount: int(data.affectedPlantCount),
        treatmentGiven: data.treatmentGiven || undefined,
      };
    case "horti_input":
      return {
        inputDate: data.inputDate,
        inputType: data.inputType,
        inputName: data.inputName,
        quantity: num(data.quantity),
        unit: data.unit,
        cost: num(data.cost),
      };
    case "horti_irrigation":
      return {
        irrigationDate: data.irrigationDate,
        method: data.method,
        durationHours: num(data.durationHours),
        waterSource: data.waterSource || undefined,
        cost: num(data.cost),
      };
    case "crop_task":
      return {
        notes: data.notes || undefined,
        inputsUsed: data.inputsUsed || undefined,
        laborHours: num(data.laborHours),
        laborType: data.laborType,
        laborCost: num(data.laborCost),
        machineryType: data.machineryType || undefined,
        machineryCost: num(data.machineryCost),
      };
    case "pop_touchpoint":
      // Handled specially in handleSave — the POST body needs subtypeCode,
      // touchpointNumber, and an auto-derived score that buildPayload has
      // no visibility into. Return a minimal stub; the caller overrides.
      return {
        taskCompleted: !!data.taskCompleted,
        timingStatus: data.timingStatus || null,
        inputsStatus: data.inputsStatus || null,
        actualCostInr: num(data.actualCostInr),
        notes: data.notes || undefined,
      };
    default:
      return data;
  }
}

/**
 * Derive a 0–100 PoP touchpoint score from the farmer's form inputs.
 *
 * Three signals (task completion, timing, inputs) each contribute evenly.
 * If the task itself wasn't done, the score collapses to the timing+inputs
 * portion — we don't zero it out entirely because a delayed-but-attempted
 * touchpoint is still more informative than a blank row.
 */
function derivePopScore(data: Record<string, any>): number {
  let score = 0;
  if (data.taskCompleted) score += 40;
  if (data.timingStatus === "ON_TIME" || data.timingStatus === "EARLY") score += 30;
  else if (data.timingStatus === "DELAYED") score += 15;
  if (data.inputsStatus === "AS_PER_POP") score += 30;
  else if (data.inputsStatus === "DEVIATION") score += 15;
  return Math.max(0, Math.min(100, score));
}

// ─── Main Component ────────────────────────────────────────────────

export default function RootsEntryScreen() {
  const router = useRouter();
  const {
    type,
    activityCode,
    subtypeCode,
    touchpointNumber,
    touchpointName,
  } = useLocalSearchParams<{
    type: string;
    activityCode?: string;
    subtypeCode?: string;
    touchpointNumber?: string;
    touchpointName?: string;
  }>();
  const entryType = (type || "dairy_milk") as EntryType;

  // For pop_touchpoint, the header title is the actual touchpoint name so
  // the farmer sees e.g. "Log: First weeding" instead of a generic label.
  const rawConfig = FORM_CONFIGS[entryType];
  const config = entryType === "pop_touchpoint" && rawConfig
    ? {
        ...rawConfig,
        title: touchpointName ? `Log: ${touchpointName}` : rawConfig.title,
      }
    : rawConfig;
  if (!config) {
    return (
      <View style={s.errorContainer}>
        <Text style={s.errorText}>Unknown entry type: {type}</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Go Back / वापस जाएं</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [formData, setFormData] = useState<Record<string, any>>(() =>
    getInitialState(entryType)
  );
  const [saving, setSaving] = useState(false);

  const setField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // pop_touchpoint is special: its "API path" is dynamic (depends on
      // activityCode from route params) and its body needs the subtype +
      // touchpoint number plus an auto-derived score. Handle it before the
      // generic apiPath path.
      if (entryType === "pop_touchpoint") {
        if (!activityCode || !touchpointNumber) {
          Alert.alert(
            "Missing context / संदर्भ अनुपलब्ध",
            "Touchpoint info is missing. Please reopen from the Farm screen."
          );
          return;
        }
        const tpNum = parseInt(touchpointNumber, 10);
        if (Number.isNaN(tpNum)) {
          Alert.alert("Error", "Invalid touchpoint number.");
          return;
        }
        const score = derivePopScore(formData);
        const body: Record<string, any> = {
          subtypeCode: subtypeCode || "",
          touchpointNumber: tpNum,
          status: "DONE",
          score,
          taskCompleted: !!formData.taskCompleted,
          timingStatus: formData.timingStatus || null,
          inputsStatus: formData.inputsStatus || null,
          actualCostInr: formData.actualCostInr ? parseFloat(formData.actualCostInr) : null,
          notes: formData.notes || null,
        };
        const res = await apiPost(`/farmer/pop/${activityCode}/touchpoints`, body);
        if (res.success === false) {
          Alert.alert(
            "Error / त्रुटि",
            res.message || "Failed to save touchpoint. / चरण सहेजने में विफल।"
          );
          return;
        }
        Alert.alert(
          "Touchpoint saved / चरण सहेजा गया",
          `Score: ${score}/100`,
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }

      const payload = buildPayload(entryType, formData);

      if (config.apiPath) {
        const res = await apiPost(config.apiPath, payload);
        if (res.success === false) {
          Alert.alert(
            "Error / त्रुटि",
            res.message || "Failed to save entry. / प्रविष्टि सहेजने में विफल।"
          );
          return;
        }
      }

      Alert.alert(
        "Success / सफल",
        config.apiPath
          ? "Entry saved successfully! / प्रविष्टि सफलतापूर्वक सहेजी गई!"
          : "Entry logged locally. / प्रविष्टि स्थानीय रूप से दर्ज की गई।",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        Alert.alert(
          "Session Expired / सत्र समाप्त",
          "Please login again. / कृपया पुनः लॉगिन करें।"
        );
        return;
      }
      Alert.alert(
        "Error / त्रुटि",
        "Something went wrong. Please try again. / कुछ गलत हो गया। कृपया पुनः प्रयास करें।"
      );
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => {
    const props = { data: formData, set: setField };
    switch (entryType) {
      case "dairy_milk":
        return <DairyMilkForm {...props} />;
      case "dairy_health":
        return <DairyHealthForm {...props} />;
      case "fishery_water":
        return <FisheryWaterForm {...props} />;
      case "fishery_stock":
        return <FisheryStockForm {...props} />;
      case "horti_harvest":
        return <HortiHarvestForm {...props} />;
      case "horti_health":
        return <HortiHealthForm {...props} />;
      case "horti_input":
        return <HortiInputForm {...props} />;
      case "horti_irrigation":
        return <HortiIrrigationForm {...props} />;
      case "crop_task":
        return <CropTaskForm {...props} />;
      case "pop_touchpoint":
        return <PopTouchpointForm {...props} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBack}>
          <Text style={s.headerBackText}>{"<"}</Text>
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>{config.title}</Text>
          <Text style={s.headerTitleHi}>{config.titleHi}</Text>
        </View>
      </View>

      {/* ── Form ── */}
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>{renderForm()}</View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>Save Entry / प्रविष्टि सहेजें</Text>
          )}
        </TouchableOpacity>

        <View style={s.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  // Header
  header: {
    backgroundColor: "#1b5e20",
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerBackText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerTitleHi: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 2,
  },

  // Scroll
  scrollContent: {
    padding: 16,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Fields
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 14,
    marginBottom: 6,
  },
  fieldLabelHi: {
    fontWeight: "400",
    color: "#666",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fafafa",
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },

  // Dropdown chips
  dropdownRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dropdownChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  },
  dropdownChipActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#2e7d32",
  },
  dropdownChipText: {
    fontSize: 13,
    color: "#555",
  },
  dropdownChipTextActive: {
    color: "#1b5e20",
    fontWeight: "600",
  },

  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
    flex: 1,
  },

  // Grade section
  gradeSection: {
    backgroundColor: "#f1f8e9",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  gradeSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#33691e",
    marginBottom: 4,
  },

  // Save button
  saveBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  bottomSpacer: {
    height: 40,
  },

  // Error fallback
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    fontSize: 16,
    color: "#c62828",
    marginBottom: 16,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
