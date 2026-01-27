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
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

console.log(
  '🔧 CORS Options configured:',
  JSON.stringify(corsOptions, null, 2),
);

// Custom CORS middleware with logging
app.use((req, res, next) => {
  console.log('\n📨 Incoming Request:');
  console.log('  Method:', req.method);
  console.log('  URL:', req.url);
  console.log('  Origin:', req.headers.origin);
  console.log('  Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

app.use(cors(corsOptions));

console.log('✅ CORS middleware applied');

// Log after CORS
app.use((req, res, next) => {
  console.log('✅ After CORS middleware');
  console.log('  Response headers:', JSON.stringify(res.getHeaders(), null, 2));
  next();
});

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  console.log('\n🔍 PREFLIGHT REQUEST DETECTED:');
  console.log('  Method:', req.method);
  console.log('  URL:', req.url);
  console.log('  Origin:', req.headers.origin);
  console.log(
    '  Access-Control-Request-Method:',
    req.headers['access-control-request-method'],
  );
  console.log(
    '  Access-Control-Request-Headers:',
    req.headers['access-control-request-headers'],
  );

  // Manually set CORS headers for preflight
  res.header(
    'Access-Control-Allow-Origin',
    process.env.FRONTEND_URL || 'http://localhost:3000',
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');

  console.log('✅ Preflight headers set:', res.getHeaders());
  res.sendStatus(204);
});

console.log('✅ Preflight handler configured');

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

// Log before routes
app.use((req, res, next) => {
  console.log('\n🛤️  Routing Request:');
  console.log('  Method:', req.method);
  console.log('  Path:', req.path);
  console.log('  Body:', req.body);
  next();
});

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
