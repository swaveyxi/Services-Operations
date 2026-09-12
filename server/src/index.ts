import 'express-async-errors';
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import timeout from 'connect-timeout';
import cookieParser from 'cookie-parser';
import { requestLogger, notFound, httpError, allowedMethods } from './utils/httpHandler';
import { globalError } from './utils/errorHandler';
import { db } from './db/database';
import { sql } from 'drizzle-orm';
import { verifyToken } from './middlewares/verifyToken';
import routes from './routes';
import authRouter from './routes/auth';
import webhooksRouter from './routes/webhooks';
import qbCallbackRouter from './routes/qbCallback';
import { validateEnv } from './config/env';
import { scheduleQbSync } from './jobs/qbSync';
import { scheduleScalingReminders } from './jobs/scalingReminders';
import { scheduleMdApprovalReminders } from './jobs/mdApprovalReminders';
import { scheduleWorkplanReminders } from './jobs/workplanReminders';
import { scheduleJobsWeeklyDigest } from './jobs/jobsWeeklyDigest';
import { isProduction } from '@shared/constants';

const app = express();
const port = process.env.PORT || 4000;

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
// QB webhook/callback have their own auth (HMAC signature, state+realmId) and
// bypass verifyToken entirely, so they need their own rate limit.
const externalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

//Middlewares
app.set('trust proxy', 1);
app.use(helmet());
app.use(timeout('30s'));
app.use(cookieParser());

// QuickBooks webhook: needs the raw request body for HMAC verification
app.use(
  '/api/webhooks',
  externalLimiter,
  express.raw({ type: 'application/json' }),
  webhooksRouter,
);

// QuickBooks OAuth callback: Intuit redirects the browser here directly, so
// it must bypass verifyToken (its own auth is the state+realmId check).
app.use('/api/quickbooks', externalLimiter, qbCallbackRouter);

// No endpoint accepts file uploads (attachments go through the OneDrive
// connector, never through this API) — a modest limit is plenty for JSON bodies.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.timedout) next();
});
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

//Request Logger
if (!isProduction) {
  app.use(requestLogger);
}

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Session lifecycle (POST/GET/DELETE) validates/sets/clears its own cookie —
// must run before the global verifyToken gate
app.use('/api/auth', authRouter);

app.use('/api', verifyToken, routes);

// Http & Global Error handlers
app.use(allowedMethods);
app.use(notFound);
app.use(httpError);
app.use(globalError);

//Connect to DB and start server
const start = async () => {
  try {
    // Validate required variables
    validateEnv();

    // Check DB connection
    await db.execute(sql`SELECT 1`);
    console.log(`[Database] database connection successful.`);

    // start Jobs
    scheduleQbSync();
    scheduleScalingReminders();
    scheduleMdApprovalReminders();
    scheduleWorkplanReminders();
    scheduleJobsWeeklyDigest();

    app.listen(port, () => {
      console.log(`[Server] server running on: ${port}`);
    });
  } catch (err) {
    console.log(err);
    console.log(`[Database] database connection unsuccessful.`);
    process.exit(1);
  }
};
start();
