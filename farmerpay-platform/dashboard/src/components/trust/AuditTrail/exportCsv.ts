/**
 * exportCsv — builds a CSV string from audit events and triggers a browser download.
 *
 * Filename pattern: `audit-{farmerId}-{YYYY-MM-DD}.csv`
 */

export interface CsvAuditRow {
  eventUuid: string;
  actorType: string;
  actorName?: string;
  action: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

const CSV_HEADERS = [
  "Event UUID",
  "Actor Type",
  "Actor Name",
  "Action",
  "Timestamp",
  "Payload",
];

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvString(rows: CsvAuditRow[]): string {
  const header = CSV_HEADERS.map(escapeCsvField).join(",");
  const lines = rows.map((r) => {
    const payloadStr = r.payload ? JSON.stringify(r.payload) : "";
    return [
      r.eventUuid,
      r.actorType,
      r.actorName ?? "",
      r.action,
      r.createdAt,
      payloadStr,
    ]
      .map(escapeCsvField)
      .join(",");
  });
  return [header, ...lines].join("\n");
}

export function downloadCsv(
  rows: CsvAuditRow[],
  farmerId: string = "unknown",
): void {
  const csv = buildCsvString(rows);
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `audit-${farmerId}-${date}.csv`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
