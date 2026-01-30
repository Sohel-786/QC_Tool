import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';
import { sanitizeSerialForPath } from '../utils/storagePath';
import type { RequestWithUploadContext } from './uploadContext.middleware';

// Ensure storage directories exist
const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storageRoot = path.resolve(process.cwd(), 'storage');
ensureDirectoryExists(path.join(storageRoot, 'items'));
ensureDirectoryExists(path.join(storageRoot, 'tools')); // legacy item images
ensureDirectoryExists(path.join(storageRoot, 'imports'));
ensureDirectoryExists(path.join(storageRoot, 'settings'));

// Items: one folder per item (by serial) – items/{serial}/master.ext
const itemsStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const r = req as RequestWithUploadContext;
    const serial =
      r.itemSerialNumberForUpload?.trim() ||
      (typeof req.body?.serialNumber === 'string' && req.body.serialNumber.trim()) ||
      '';
    const safe = serial ? sanitizeSerialForPath(serial) : 'unknown';
    const dir = path.join(storageRoot, 'items', safe);
    ensureDirectoryExists(dir);
    cb(null, dir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `master${ext}`);
  },
});

// Returns (inward): items/{serial}/inward/inward-issue-{issueId}-{timestamp}.ext – traceability for ledger
const returnsStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const r = req as RequestWithUploadContext;
    const serial = r.itemSerialNumberForUpload?.trim() || 'unknown';
    const safe = sanitizeSerialForPath(serial);
    const dir = path.join(storageRoot, 'items', safe, 'inward');
    ensureDirectoryExists(dir);
    cb(null, dir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const issueId = req.body?.issueId ?? 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `inward-issue-${issueId}-${timestamp}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed!'));
  }
};

/** Accept any image/* MIME type for company logo */
const settingsLogoFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for the company logo.'));
  }
};

const excelMimeTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];
const excelFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (excelMimeTypes.includes(file.mimetype) || ext === '.xlsx' || ext === '.xls') {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed.'));
  }
};

const importStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, path.join(storageRoot, 'imports'));
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.xlsx';
    cb(null, `import-${uniqueSuffix}${ext}`);
  },
});

// Settings: company logo — settings/logo.{ext}
const settingsStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, path.join(storageRoot, 'settings'));
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo${ext}`);
  },
});

// Memory storage for returns – parse form first so req.body is set before validation
const returnsMemoryStorage = multer.memoryStorage();

// Upload middleware for returns (disk) – used when attachIssueAndItemForReturn runs first (legacy)
export const upload = multer({
  storage: returnsStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Upload middleware for returns that parses multipart first (no disk write) – run before validation
export const uploadReturnForm = multer({
  storage: returnsMemoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Upload middleware for items
export const uploadItemImage = multer({
  storage: itemsStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Upload middleware for Excel import (masters)
export const uploadImportExcel = multer({
  storage: importStorage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Upload middleware for settings (company logo) – accept all image types
export const uploadSettingsLogo = multer({
  storage: settingsStorage,
  fileFilter: settingsLogoFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
