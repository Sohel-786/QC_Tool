// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Environment variables loaded');
console.log('📍 FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('📍 PORT:', process.env.PORT);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

console.log('✅ All imports loaded successfully');

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import itemRoutes from './routes/items.routes';
import itemCategoryRoutes from './routes/itemCategories.routes';
import issueRoutes from './routes/issues.routes';
import returnRoutes from './routes/returns.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/reports.routes';
import companyRoutes from './routes/companies.routes';
import locationRoutes from './routes/locations.routes';
import contractorRoutes from './routes/contractors.routes';
import statusRoutes from './routes/statuses.routes';
import machineRoutes from './routes/machines.routes';
import settingsRoutes from './routes/settings.routes';

console.log('✅ All route modules loaded');

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFoundHandler';

console.log('✅ Middleware modules loaded');

// Create Express app
const app = express();

console.log('✅ Express app created');

// CORS configuration - MUST come before other middleware
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [
  frontendUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter((url, i, arr) => arr.indexOf(url) === i);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (e.g. Postman, curl, same-origin)
    if (!origin) return callback(null, true);
    // Allow if origin is in the list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Development: allow any localhost / 127.0.0.1
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
    } catch {
      // invalid URL
    }
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie',
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

console.log(
  '🔧 CORS Options configured:',
  JSON.stringify({ ...corsOptions, origin: '[Function]' }, null, 2),
);

// Apply CORS middleware FIRST, before anything else
app.use(cors(corsOptions));

console.log('✅ CORS middleware applied');

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

console.log('✅ Body parsers configured');

// Other middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

console.log('✅ Helmet configured');

app.use(morgan('dev'));

console.log('✅ Morgan configured');

app.use(cookieParser());

console.log('✅ Cookie parser configured');

// Serve static files from storage directory
app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));

console.log('✅ Static files middleware configured');

// Routes
app.use(
  '/auth',
  (req, res, next) => {
    console.log('📍 Entering /auth route');
    next();
  },
  authRoutes,
);

app.use(
  '/users',
  (req, res, next) => {
    console.log('📍 Entering /users route');
    next();
  },
  userRoutes,
);

app.use(
  '/items',
  (req, res, next) => {
    console.log('📍 Entering /items route');
    next();
  },
  itemRoutes,
);

app.use(
  '/item-categories',
  (req, res, next) => {
    console.log('📍 Entering /item-categories route');
    next();
  },
  itemCategoryRoutes,
);

app.use(
  '/companies',
  (req, res, next) => {
    console.log('📍 Entering /companies route');
    next();
  },
  companyRoutes,
);

app.use(
  '/locations',
  (req, res, next) => {
    console.log('📍 Entering /locations route');
    next();
  },
  locationRoutes,
);

app.use(
  '/contractors',
  (req, res, next) => {
    console.log('📍 Entering /contractors route');
    next();
  },
  contractorRoutes,
);

app.use(
  '/statuses',
  (req, res, next) => {
    console.log('📍 Entering /statuses route');
    next();
  },
  statusRoutes,
);

app.use(
  '/machines',
  (req, res, next) => {
    console.log('📍 Entering /machines route');
    next();
  },
  machineRoutes,
);

app.use(
  '/issues',
  (req, res, next) => {
    console.log('📍 Entering /issues route');
    next();
  },
  issueRoutes,
);

app.use(
  '/returns',
  (req, res, next) => {
    console.log('📍 Entering /returns route');
    next();
  },
  returnRoutes,
);

app.use(
  '/dashboard',
  (req, res, next) => {
    console.log('📍 Entering /dashboard route');
    next();
  },
  dashboardRoutes,
);

app.use(
  '/reports',
  (req, res, next) => {
    console.log('📍 Entering /reports route');
    next();
  },
  reportRoutes,
);

app.use(
  '/settings',
  (req, res, next) => {
    console.log('📍 Entering /settings route');
    next();
  },
  settingsRoutes,
);

console.log('✅ All routes registered');

// Health check
app.get('/ping', (req, res) => {
  console.log('🏓 Ping endpoint hit');
  res.json({ success: true, message: 'Pong' });
});

console.log('✅ Health check endpoint registered');

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

console.log('✅ Error handlers registered');
console.log('✅ App.ts configuration complete\n');

export default app;
