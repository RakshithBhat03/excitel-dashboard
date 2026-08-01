import { $ } from 'bun';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type {
  BackupFile,
  BackupResult,
  RestoreResult,
  RotationResult,
} from '../types/backup';
import { getErrorMessage } from '../utils/errors';

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const FILE_PREFIX = 'excitel_';
const FILE_EXT = '.dump';
const BACKUP_FILENAME_PATTERN = /^excitel_\d{4}-\d{2}-\d{2}_\d{6}\.dump$/;

function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}` +
    `_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
  );
}

export async function createBackup(): Promise<BackupResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set; cannot create backup');
  }

  ensureBackupDir();
  const filename = `${FILE_PREFIX}${timestamp()}${FILE_EXT}`;
  const filepath = join(BACKUP_DIR, filename);
  console.log(`[${new Date().toISOString()}] Creating backup: ${filename}`);

  await $`pg_dump -Fc -f ${filepath} ${process.env.DATABASE_URL}`.quiet();

  const sizeBytes = statSync(filepath).size;
  const sizeMb = (sizeBytes / 1024 / 1024).toFixed(2);
  console.log(`Backup complete: ${filename} (${sizeMb} MB)`);
  rotateBackups();

  return { filename, filepath, sizeBytes };
}

export function rotateBackups(): RotationResult {
  ensureBackupDir();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = readdirSync(BACKUP_DIR)
    .filter((name) => name.startsWith(FILE_PREFIX) && name.endsWith(FILE_EXT))
    .map((name) => {
      const filepath = join(BACKUP_DIR, name);
      return { name, filepath, mtime: statSync(filepath).mtimeMs };
    })
    .sort((a, b) => a.mtime - b.mtime);

  let removed = 0;
  for (const file of files) {
    if (file.mtime < cutoff) {
      try {
        unlinkSync(file.filepath);
        console.log(`Removed expired backup: ${file.name}`);
        removed += 1;
      } catch (error: unknown) {
        console.error(`Failed to remove backup ${file.name}:`, getErrorMessage(error));
      }
    }
  }

  if (removed > 0) {
    console.log(`Rotation complete: removed ${removed} backup(s) older than ${RETENTION_DAYS} days`);
  }
  return { removed, kept: files.length - removed };
}

export async function restoreBackup(filename: string): Promise<RestoreResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set; cannot restore backup');
  }
  if (!BACKUP_FILENAME_PATTERN.test(filename)) throw new Error('Invalid backup filename');

  const filepath = join(BACKUP_DIR, filename);
  if (!existsSync(filepath)) throw new Error(`Backup file not found: ${filepath}`);

  console.log(`[${new Date().toISOString()}] Restoring backup: ${filename}`);
  await $`pg_restore --clean --if-exists -d ${process.env.DATABASE_URL} ${filepath}`.quiet();
  console.log(`Restore complete: ${filename}`);
  return { filename, filepath };
}

export function listBackups(): BackupFile[] {
  ensureBackupDir();
  return readdirSync(BACKUP_DIR)
    .filter((name) => name.startsWith(FILE_PREFIX) && name.endsWith(FILE_EXT))
    .map((name) => {
      const filepath = join(BACKUP_DIR, name);
      const stats = statSync(filepath);
      return { filename: name, sizeBytes: stats.size, createdAt: stats.mtime };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
