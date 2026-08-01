import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pool, testConnection } from './config/database.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

// Middleware
app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '100kb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// API routes
app.use('/api', apiRoutes);

// Keep framework details and internal errors out of public responses.
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((error, _req, res, _next) => {
  void _next;
  const message = error instanceof Error ? error.message : 'Unknown server error';
  console.error('Unhandled server error:', message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
  });
}

start();
