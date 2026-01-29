declare module "xlsx" {
  export interface WorkSheet {
    [cell: string]: unknown;
  }
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }
  export const utils: {
    book_new(): WorkBook;
    book_append_sheet(workbook: WorkBook, sheet: WorkSheet, name: string): void;
    json_to_sheet(data: Record<string, unknown>[]): WorkSheet;
    sheet_to_json<T = Record<string, unknown>>(sheet: WorkSheet, opts?: { raw?: boolean; defval?: unknown }): T[];
  };
  export function read(data: Buffer | ArrayBuffer, opts: { type: "buffer" }): WorkBook;
  export function write(workbook: WorkBook, opts: { type: "buffer"; bookType: string }): Buffer;
}
