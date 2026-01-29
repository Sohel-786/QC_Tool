export enum Role {
  QC_USER = 'QC_USER',
  QC_MANAGER = 'QC_MANAGER',
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
  createdAt: string;
  updatedAt: string;
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
  item?: Item;
  company?: Company;
  contractor?: Contractor;
  machine?: Machine;
  user?: User;
  issuedByUser?: User;
}

export interface Return {
  id: number;
  returnCode?: string;
  issueId: number;
  returnedBy: number;
  returnImage: string;
  remarks?: string;
  statusId?: number | null;
  returnedAt: string;
  updatedAt: string;
  issue?: Issue;
  status?: Status;
  user?: User;
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
