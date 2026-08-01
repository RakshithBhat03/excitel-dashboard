import cron from 'node-cron';
import { getErrorMessage } from './utils/errors';
import { testConnection } from './config/database';
import { createBackup } from './services/backupService';
import { syncAllMonths, syncCurrentMonth } from './services/syncService';

const SYNC_CRON_SCHEDULE = process.env.SYNC_CRON_SCHEDULE || '0 0 * * *';
const BACKUP_CRON_SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *';
const RUN_ON_STARTUP = process.env.RUN_ON_STARTUP !== 'false';

async function start(): Promise<void> {
  await testConnection();

  console.log('Cron worker started.');
  console.log(`  Sync schedule:   ${SYNC_CRON_SCHEDULE}`);
  console.log(`  Backup schedule: ${BACKUP_CRON_SCHEDULE}`);

  if (RUN_ON_STARTUP) {
    console.log('Running initial sync on startup...');
    await syncAllMonths();
  }

  cron.schedule(SYNC_CRON_SCHEDULE, (): void => {
    console.log(`[${new Date().toISOString()}] Running scheduled sync...`);
    void syncCurrentMonth();
  });

  cron.schedule(BACKUP_CRON_SCHEDULE, (): void => {
    void createBackup().catch((error: unknown) => {
      console.error(`Backup failed: ${getErrorMessage(error)}`);
    });
  });

  console.log('Worker is running. Waiting for scheduled jobs...');
}

void start().catch((error: unknown) => console.error(getErrorMessage(error)));
