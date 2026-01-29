import * as XLSX from "xlsx";

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Build a buffer for an Excel file from an array of row objects.
 * First row is the header (keys of the first object).
 */
export function buildExcelBuffer(
  rows: Record<string, unknown>[],
  sheetName = "Sheet1"
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  );
}

/**
 * Parse an uploaded Excel file (buffer) and return an array of row objects.
 * Uses the first row as headers.
 */
export function parseExcelBuffer(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: "",
  }) as Record<string, unknown>[];
  return rows;
}

export function getExcelMime(): string {
  return EXCEL_MIME;
}

/**
 * Normalize header key: trim, lowercase, replace spaces with underscore.
 */
export function normalizeHeaderKey(key: string): string {
  return String(key)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Normalize a row's keys using normalizeHeaderKey.
 */
export function normalizeRowKeys(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const n = normalizeHeaderKey(k);
    if (n) out[n] = v;
  }
  return out;
}
