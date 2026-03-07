import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pool, testConnection } from './config/database.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

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

// Start server
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
  });
}

start();
