import * as XLSX from "xlsx";
import { Workbook } from "exceljs";

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MIN_COL_WIDTH = 10;
const MAX_COL_WIDTH = 55;

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
 * Build a formatted Excel buffer with bold header row and auto-sized column widths.
 * Optional titleRow is added as the first row (e.g. "Ledger for: Item Name (Serial: X)").
 */
export async function buildFormattedExcelBuffer(
  rows: Record<string, unknown>[],
  sheetName = "Sheet1",
  options?: { titleRow?: string }
): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: options?.titleRow ? 2 : 1 }],
  });

  if (rows.length === 0 && !options?.titleRow) {
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];
  let startRow = 1;

  if (options?.titleRow) {
    worksheet.mergeCells(1, 1, 1, Math.max(headers.length, 1));
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = options.titleRow;
    titleCell.font = { bold: true, size: 12 };
    startRow = 2;
  }

  if (headers.length === 0) {
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  const headerRow = worksheet.getRow(startRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11 };
  });
  headerRow.commit();
  let dataStartRow = startRow + 1;

  rows.forEach((row, idx) => {
    const rowObj = worksheet.getRow(dataStartRow + idx);
    headers.forEach((key, colIndex) => {
      const val = row[key];
      rowObj.getCell(colIndex + 1).value =
        val !== undefined && val !== null ? String(val) : "";
    });
    rowObj.commit();
  });

  const colWidths = headers.map((header, colIndex) => {
    let maxLen = Math.min(header.length, MAX_COL_WIDTH);
    for (let r = 0; r < rows.length; r++) {
      const val = rows[r]![headers[colIndex]!];
      const str =
        val !== undefined && val !== null ? String(val) : "";
      maxLen = Math.min(Math.max(maxLen, str.length), MAX_COL_WIDTH);
    }
    return Math.max(MIN_COL_WIDTH, Math.min(maxLen + 2, MAX_COL_WIDTH));
  });

  colWidths.forEach((w, i) => {
    worksheet.getColumn(i + 1).width = w;
  });

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
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
