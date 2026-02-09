export enum Role {
  QC_USER = 'QC_USER',
  QC_MANAGER = 'QC_MANAGER',
  QC_ADMIN = 'QC_ADMIN',
}

export enum ItemStatus {
  AVAILABLE = 'AVAILABLE',
  ISSUED = 'ISSUED',
  MISSING = 'MISSING',
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: number;
  itemName: string;
  description?: string | null;
  image?: string | null;
  serialNumber?: string | null;
  categoryId?: number | null;
  status: ItemStatus;
  isActive: boolean;
  latestImage?: string | null;
  _count?: {
    issues: number;
  };
  createdAt: string;
  updatedAt: string;
  /** Inward number that recorded this item as Missing (from GET /items/missing) */
  sourceInwardCode?: string | null;
}

export interface ItemCategory {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: number;
  name: string;
  companyId: number;
  company?: Company;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contractor {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Status {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Machine {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: number;
  issueNo: string;
  itemId: number;
  issuedBy: number;
  issuedTo?: string;
  remarks?: string;
  isActive: boolean;
  isReturned: boolean;
  issuedAt: string;
  updatedAt: string;
  companyId?: number | null;
  contractorId?: number | null;
  machineId?: number | null;
  locationId?: number | null;
  item?: Item;
  company?: Company;
  contractor?: Contractor;
  machine?: Machine;
  location?: Location;
  user?: User;
  issuedByUser?: User;
}

export const RETURN_CONDITIONS = [
  "OK",
  "Damaged",
  "Calibration Required",
  "Missing",
] as const;
export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export interface Return {
  id: number;
  returnCode?: string | null;
  issueId?: number | null;
  itemId?: number | null;
  condition: string;
  returnedBy: number;
  returnImage?: string | null;
  remarks?: string | null;
  receivedBy?: string | null;
  statusId?: number | null;
  isActive: boolean;
  returnedAt: string;
  updatedAt: string;
  companyId?: number | null;
  contractorId?: number | null;
  machineId?: number | null;
  locationId?: number | null;
  issue?: Issue | null;
  item?: Item | null;
  company?: Company | null;
  contractor?: Contractor | null;
  machine?: Machine | null;
  location?: Location | null;
  status?: Status | null;
  user?: User;
  /** Inward number that recorded this item as Missing (for receive-missing-item returns) */
  sourceInwardCode?: string | null;
}

export interface DashboardMetrics {
  items: {
    total: number;
    available: number;
    issued: number;
    missing: number;
  };
  issues: {
    total: number;
    active: number;
  };
  returns: {
    total: number;
  };
}

export interface AppSettings {
  id: number;
  companyName: string;
  companyLogo?: string | null;
  softwareName?: string | null;
  primaryColor?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermission {
  id: number;
  role: string;
  viewDashboard: boolean;
  viewMaster: boolean;
  viewCompanyMaster: boolean;
  viewLocationMaster: boolean;
  viewContractorMaster: boolean;
  viewStatusMaster: boolean;
  viewMachineMaster: boolean;
  viewItemMaster: boolean;
  viewItemCategoryMaster: boolean;
  viewOutward: boolean;
  viewInward: boolean;
  viewReports: boolean;
  viewActiveIssuesReport: boolean;
  viewMissingItemsReport: boolean;
  viewItemHistoryLedgerReport: boolean;
  importExportMaster: boolean;
  addOutward: boolean;
  editOutward: boolean;
  addInward: boolean;
  editInward: boolean;
  addMaster: boolean;
  editMaster: boolean;
  manageUsers: boolean;
  accessSettings: boolean;
  navigationLayout: 'VERTICAL' | 'HORIZONTAL';
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationEntry<T = any> {
  row: number;
  data: T;
  message?: string;
}

export interface ValidationResult<T = any> {
  valid: ValidationEntry<T>[];
  duplicates: ValidationEntry<T>[];
  alreadyExists: ValidationEntry<T>[];
  invalid: ValidationEntry<T>[];
  totalRows: number;
}
