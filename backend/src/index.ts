import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { CorsOptions } from 'cors';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { pool, testConnection } from './config/database';
import apiRoutes from './routes/api';
import { getErrorMessage } from './utils/errors';

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.disable('x-powered-by');
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
  allowedHeaders: ['Content-Type'],
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

app.use('/api', apiRoutes);

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
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
  });
}

void start().catch((error: unknown) => {
  console.error('Backend failed to start:', getErrorMessage(error));
});
