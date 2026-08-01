export interface BackupFile {
  filename: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface BackupResult {
  filename: string;
  filepath: string;
  sizeBytes: number;
}

export interface RotationResult {
  removed: number;
  kept: number;
}

export interface RestoreResult {
  filename: string;
  filepath: string;
}
