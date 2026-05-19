"use client";

/**
 * ChecklistField — One-question-at-a-time checklist field (G4 — Spec §5.3 + §5.8).
 *
 * Field types:
 *   - text: free-form text input
 *   - number: numeric input
 *   - select: dropdown with options
 *   - photo: camera/file upload + optional geotag toggle
 *   - boolean: yes/no toggle
 *
 * Supports Mark N/A path with reason picker.
 * Auto-save triggers on every value change via onChange callback.
 *
 * PRIVACY (§5.5): Never renders score-adjacent copy.
 */

import { useState, useCallback, useRef } from "react";

// ─── N/A Reason enum ──────────────────────────────────────

export const NA_REASONS = [
  "NOT_APPLICABLE",
  "FARMER_ABSENT",
  "DATA_UNAVAILABLE",
  "WILL_PROVIDE_LATER",
] as const;

export type NaReason = (typeof NA_REASONS)[number];

export const NA_REASON_LABELS: Record<NaReason, string> = {
  NOT_APPLICABLE: "Not applicable",
  FARMER_ABSENT: "Farmer was absent",
  DATA_UNAVAILABLE: "Data not available",
  WILL_PROVIDE_LATER: "Will provide later",
};

// ─── Types ────────────────────────────────────────────────

export type FieldType = "text" | "number" | "select" | "photo" | "boolean";

export interface ChecklistFieldDef {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select type
  placeholder?: string;
  enableGeotag?: boolean; // for photo type
}

export interface FieldValue {
  value: string | number | boolean | null;
  photoUri?: string | null;
  lat?: number | null;
  lng?: number | null;
  isNa?: boolean;
  naReason?: NaReason | null;
}

export interface ChecklistFieldProps {
  field: ChecklistFieldDef;
  value: FieldValue;
  onChange: (fieldId: string, value: FieldValue) => void;
}

// ─── Component ────────────────────────────────────────────

export default function ChecklistField({
  field,
  value,
  onChange,
}: ChecklistFieldProps) {
  const [showNaPicker, setShowNaPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback(
    (partial: Partial<FieldValue>) => {
      onChange(field.id, { ...value, ...partial });
    },
    [field.id, value, onChange],
  );

  // ── Mark N/A ────────────────────────────────────────

  const handleMarkNa = useCallback(() => {
    setShowNaPicker(true);
  }, []);

  const handleNaSelect = useCallback(
    (reason: NaReason) => {
      emit({ isNa: true, naReason: reason, value: null });
      setShowNaPicker(false);
    },
    [emit],
  );

  const handleClearNa = useCallback(() => {
    emit({ isNa: false, naReason: null });
    setShowNaPicker(false);
  }, [emit]);

  // ── Photo upload ────────────────────────────────────

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Create a local URL for preview
        const uri = URL.createObjectURL(file);
        emit({ photoUri: uri, value: file.name });
      }
    },
    [emit],
  );

  const handleGeotagToggle = useCallback(() => {
    if (value.lat != null) {
      // Clear geotag
      emit({ lat: null, lng: null });
    } else {
      // Request geolocation
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            emit({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            // Permission denied or error — stay without geotag
          },
        );
      }
    }
  }, [value.lat, emit]);

  // ── N/A state ───────────────────────────────────────

  if (value.isNa) {
    return (
      <div className="flex flex-col gap-3" data-testid="checklist-field">
        <label className="text-sm font-medium" data-testid="field-label">
          {field.label}
        </label>
        <div
          className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 p-4 text-center text-sm text-muted-foreground"
          data-testid="field-na-state"
        >
          Marked N/A: {value.naReason ? NA_REASON_LABELS[value.naReason] : "No reason"}
        </div>
        <button
          type="button"
          className="self-start text-xs text-primary underline-offset-2 hover:underline"
          onClick={handleClearNa}
          data-testid="field-clear-na"
        >
          Undo N/A
        </button>
      </div>
    );
  }

  // ── N/A picker ──────────────────────────────────────

  if (showNaPicker) {
    return (
      <div className="flex flex-col gap-3" data-testid="checklist-field">
        <label className="text-sm font-medium" data-testid="field-label">
          {field.label}
        </label>
        <p className="text-xs text-muted-foreground">Select a reason:</p>
        <div className="flex flex-col gap-1" data-testid="na-reason-picker">
          {NA_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className="rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => handleNaSelect(reason)}
              data-testid="na-reason-option"
              data-reason={reason}
            >
              {NA_REASON_LABELS[reason]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="self-start text-xs text-muted-foreground hover:underline"
          onClick={() => setShowNaPicker(false)}
          data-testid="na-cancel"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Active field ────────────────────────────────────

  return (
    <div className="flex flex-col gap-3" data-testid="checklist-field">
      <label className="text-sm font-medium" data-testid="field-label">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {/* Text input */}
      {field.type === "text" && (
        <input
          type="text"
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          placeholder={field.placeholder || "Enter value"}
          value={(value.value as string) ?? ""}
          onChange={(e) => emit({ value: e.target.value })}
          data-testid="field-input-text"
        />
      )}

      {/* Number input */}
      {field.type === "number" && (
        <input
          type="number"
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          placeholder={field.placeholder || "Enter number"}
          value={value.value != null ? String(value.value) : ""}
          onChange={(e) =>
            emit({ value: e.target.value ? Number(e.target.value) : null })
          }
          data-testid="field-input-number"
        />
      )}

      {/* Select */}
      {field.type === "select" && (
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          value={(value.value as string) ?? ""}
          onChange={(e) => emit({ value: e.target.value || null })}
          data-testid="field-input-select"
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {/* Boolean */}
      {field.type === "boolean" && (
        <div className="flex items-center gap-3" data-testid="field-input-boolean">
          <button
            type="button"
            className={
              "rounded-md border px-4 py-1.5 text-sm font-medium " +
              (value.value === true
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-border text-muted-foreground hover:bg-muted")
            }
            onClick={() => emit({ value: true })}
            data-testid="field-bool-yes"
          >
            Yes
          </button>
          <button
            type="button"
            className={
              "rounded-md border px-4 py-1.5 text-sm font-medium " +
              (value.value === false
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-border text-muted-foreground hover:bg-muted")
            }
            onClick={() => emit({ value: false })}
            data-testid="field-bool-no"
          >
            No
          </button>
        </div>
      )}

      {/* Photo */}
      {field.type === "photo" && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
            data-testid="field-photo-input"
          />
          <button
            type="button"
            className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
            data-testid="field-photo-button"
          >
            {value.photoUri ? "Replace photo" : "Take photo or upload"}
          </button>
          {value.photoUri && (
            <p className="text-xs text-emerald-600" data-testid="field-photo-name">
              Photo attached: {value.value as string}
            </p>
          )}

          {/* Geotag toggle */}
          {field.enableGeotag && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={value.lat != null}
                onChange={handleGeotagToggle}
                data-testid="field-geotag-toggle"
              />
              <span data-testid="field-geotag-label">
                {value.lat != null
                  ? "Geotagged (" + value.lat.toFixed(4) + ", " + value.lng?.toFixed(4) + ")"
                  : "Attach geotag"}
              </span>
            </label>
          )}
        </div>
      )}

      {/* Mark N/A button */}
      <button
        type="button"
        className="self-start text-xs text-muted-foreground hover:text-foreground hover:underline"
        onClick={handleMarkNa}
        data-testid="field-mark-na"
      >
        Mark N/A
      </button>
    </div>
  );
}
