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
  itemCode: string;
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
  code: string | null;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contractor {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Status {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Machine {
  id: number;
  code: string;
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
  isReturned: boolean;
  issuedAt: string;
  updatedAt: string;
  item?: Item;
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
  returnedAt: string;
  updatedAt: string;
  issue?: Issue;
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
