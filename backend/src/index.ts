import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { CorsOptions } from 'cors';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { pool, testConnection } from './config/database';
import {
  allowedOrigins,
  apiRateLimit,
  assertApiAuthConfiguration,
  isApiAuthEnabled,
  requireApiAuth,
} from './middleware/security';
import apiRoutes from './routes/api';
import { getErrorMessage } from './utils/errors';

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

app.disable('x-powered-by');
// The backend does not trust client-supplied X-Forwarded-* headers. If the
// deployment adds a trusted proxy, configure that topology explicitly.
app.set('trust proxy', false);
app.use(helmet());
app.use(compression());

const corsOptions: CorsOptions = {
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void): void {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

app.use('/api', (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', requireApiAuth, apiRateLimit, apiRoutes);

app.use((_req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: 'Not found' });
});

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('Unhandled server error:', getErrorMessage(error));
  res.status(500).json({ success: false, error: 'Internal server error' });
};
app.use(errorHandler);

async function start(): Promise<void> {
  assertApiAuthConfiguration();
  if (!isApiAuthEnabled()) {
    console.warn(
      'API authentication is disabled; keep the backend and reverse proxy on trusted private networks',
    );
  }
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
  });
}

void start().catch((error: unknown) => {
  console.error('Backend failed to start:', getErrorMessage(error));
});
