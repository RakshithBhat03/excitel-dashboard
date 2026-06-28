import cron from 'node-cron';
import { testConnection } from './config/database.js';
import { syncCurrentMonth, syncAllMonths } from './services/syncService.js';
import { createBackup } from './services/backupService.js';

const SYNC_CRON_SCHEDULE = process.env.SYNC_CRON_SCHEDULE || '0 0 * * *';
const BACKUP_CRON_SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *';
const RUN_ON_STARTUP = process.env.RUN_ON_STARTUP !== 'false';

async function start() {
  await testConnection();

  console.log(`Cron worker started.`);
  console.log(`  Sync schedule:   ${SYNC_CRON_SCHEDULE}`);
  console.log(`  Backup schedule: ${BACKUP_CRON_SCHEDULE}`);

  if (RUN_ON_STARTUP) {
    console.log('Running initial sync on startup...');
    await syncAllMonths();
  }

  cron.schedule(SYNC_CRON_SCHEDULE, async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled sync...`);
    await syncCurrentMonth();
  });

  cron.schedule(BACKUP_CRON_SCHEDULE, async () => {
    try {
      await createBackup();
    } catch (error) {
      console.error(`Backup failed: ${error.message}`);
    }
  });

  console.log('Worker is running. Waiting for scheduled jobs...');
}

start().catch(console.error);
