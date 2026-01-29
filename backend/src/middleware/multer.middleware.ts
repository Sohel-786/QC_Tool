import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';

// Ensure storage directories exist
const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDirectoryExists('./storage/returns');
ensureDirectoryExists('./storage/items');
ensureDirectoryExists('./storage/tools'); // legacy item images

// Returns storage configuration
const returnsStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, './storage/returns');
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const issueId = req.body.issueId || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${issueId}-${uniqueSuffix}${ext}`);
  },
});

// Items storage configuration
const itemsStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, './storage/items');
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const itemCode = req.body.itemCode || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${itemCode}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed!'));
  }
};

// Upload middleware for returns
export const upload = multer({
  storage: returnsStorage,
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
