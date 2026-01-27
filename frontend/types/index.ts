export enum Role {
  QC_USER = 'QC_USER',
  QC_MANAGER = 'QC_MANAGER',
}

export enum ToolStatus {
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

export interface Tool {
  id: number;
  toolCode: string;
  toolName: string;
  description?: string;
  status: ToolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Division {
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
  toolId: number;
  divisionId: number;
  issuedBy: number;
  issuedTo?: string;
  remarks?: string;
  isReturned: boolean;
  issuedAt: string;
  updatedAt: string;
  tool?: Tool;
  division?: Division;
  user?: User;
}

export interface Return {
  id: number;
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
  tools: {
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
