import cron from 'node-cron';
import { testConnection } from './config/database.js';
import { syncCurrentMonth, syncAllMonths } from './services/syncService.js';

const CRON_SCHEDULE = process.env.SYNC_CRON_SCHEDULE || '0 0 * * *';
const RUN_ON_STARTUP = process.env.RUN_ON_STARTUP !== 'false';

async function start() {
  await testConnection();

  console.log(`Cron worker started. Schedule: ${CRON_SCHEDULE}`);

  if (RUN_ON_STARTUP) {
    console.log('Running initial sync on startup...');
    await syncAllMonths();
  }

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled sync...`);
    await syncCurrentMonth();
  });

  console.log('Worker is running. Waiting for scheduled jobs...');
}

start().catch(console.error);
