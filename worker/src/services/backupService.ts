import { $ } from 'bun';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
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

interface PostgresConnection {
  host: string;
  port: string;
  user: string;
  database: string;
  password: string;
}

function getPostgresConnection(): PostgresConnection {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set; cannot run PostgreSQL command');

  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error('Unsupported database URL protocol');
    }

    const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    if (!url.hostname || !database || !user) throw new Error('Incomplete database URL');

    return {
      host: url.hostname,
      port: url.port || '5432',
      user,
      database,
      password,
    };
  } catch {
    throw new Error('DATABASE_URL is invalid; cannot run PostgreSQL command');
  }
}

function escapePgPassValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:');
}

function createPgPassFile(connection: PostgresConnection): string {
  const filepath = join('/tmp', `.excitel-pgpass-${randomUUID()}`);
  const line = [
    escapePgPassValue(connection.host),
    escapePgPassValue(connection.port),
    escapePgPassValue(connection.database),
    escapePgPassValue(connection.user),
    escapePgPassValue(connection.password),
  ].join(':');
  writeFileSync(filepath, `${line}\n`, { encoding: 'utf8', mode: 0o600 });
  return filepath;
}

function commandEnvironment(pgPassFile: string): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'DATABASE_URL' && key !== 'PGPASSWORD') {
      environment[key] = value;
    }
  }
  environment.PGPASSFILE = pgPassFile;
  return environment;
}

async function withPostgresAuth<TResult>(
  operation: (connection: PostgresConnection, environment: Record<string, string>) => Promise<TResult>,
): Promise<TResult> {
  const connection = getPostgresConnection();
  const pgPassFile = createPgPassFile(connection);
  try {
    return await operation(connection, commandEnvironment(pgPassFile));
  } finally {
    try {
      unlinkSync(pgPassFile);
    } catch {
      // The backup result is still useful if cleanup races with container shutdown.
    }
  }
}

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
  ensureBackupDir();
  const filename = `${FILE_PREFIX}${timestamp()}${FILE_EXT}`;
  const filepath = join(BACKUP_DIR, filename);
  console.log(`[${new Date().toISOString()}] Creating backup: ${filename}`);

  await withPostgresAuth(async (connection, environment) => {
    await $`pg_dump -Fc -h ${connection.host} -p ${connection.port} -U ${connection.user} -d ${connection.database} -f ${filepath}`
      .env(environment)
      .quiet();
  });

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
  if (!BACKUP_FILENAME_PATTERN.test(filename)) throw new Error('Invalid backup filename');

  const filepath = join(BACKUP_DIR, filename);
  if (!existsSync(filepath)) throw new Error(`Backup file not found: ${filepath}`);

  console.log(`[${new Date().toISOString()}] Restoring backup: ${filename}`);
  await withPostgresAuth(async (connection, environment) => {
    await $`pg_restore --clean --if-exists -h ${connection.host} -p ${connection.port} -U ${connection.user} -d ${connection.database} ${filepath}`
      .env(environment)
      .quiet();
  });
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
