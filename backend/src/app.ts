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
import toolRoutes from './routes/tools.routes';
import divisionRoutes from './routes/divisions.routes';
import issueRoutes from './routes/issues.routes';
import returnRoutes from './routes/returns.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/reports.routes';

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

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (origin === frontendUrl) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
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
  '/tools',
  (req, res, next) => {
    console.log('📍 Entering /tools route');
    next();
  },
  toolRoutes,
);

app.use(
  '/divisions',
  (req, res, next) => {
    console.log('📍 Entering /divisions route');
    next();
  },
  divisionRoutes,
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
