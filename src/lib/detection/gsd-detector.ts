import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { paths } from '../paths.js';
import { checkFreshness } from './freshness.js';
import type { GSDDetectionResult } from '../../types/index.js';

/**
 * Required files that must exist for a valid GSD installation.
 */
const REQUIRED_FILES = ['package.json', 'README.md'];

/**
 * Required directories that must exist for a valid GSD installation.
 */
const REQUIRED_DIRS = ['commands', 'agents'];

/**
 * Structure validation result.
 */
export interface ValidationResult {
  valid: boolean;
  missingFiles: string[];
  missingDirs: string[];
}

/**
 * Validate GSD directory structure.
 *
 * Checks that required files (package.json, README.md) exist and are files,
 * and that required directories (commands/, agents/) exist and are directories.
 *
 * @param gsdPath - Path to the GSD installation
 * @returns Validation result with lists of missing files and directories
 */
export async function validateGSDStructure(gsdPath: string): Promise<ValidationResult> {
  const missingFiles: string[] = [];
  const missingDirs: string[] = [];

  // Check required files exist and are files
  for (const file of REQUIRED_FILES) {
    const filePath = join(gsdPath, file);
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        missingFiles.push(`${file} (exists but not a file)`);
      }
    } catch {
      missingFiles.push(file);
    }
  }

  // Check required directories exist and are directories
  for (const dir of REQUIRED_DIRS) {
    const dirPath = join(gsdPath, dir);
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        missingDirs.push(`${dir} (exists but not a directory)`);
      }
    } catch {
      missingDirs.push(dir);
    }
  }

  return {
    valid: missingFiles.length === 0 && missingDirs.length === 0,
    missingFiles,
    missingDirs
  };
}

/**
 * Detect GSD installation with three-phase detection:
 * 1. Path existence - Check if default path exists
 * 2. Structure validation - Verify required files and directories
 * 3. Freshness checking - Determine if installation is outdated
 *
 * Never throws - all errors return structured GSDDetectionResult.
 *
 * @returns Detection result with found status, validation, and freshness info
 */
export async function detectGSD(): Promise<GSDDetectionResult> {
  const gsdPath = paths.gsdDir();

  // Phase 1: Check if default path exists
  try {
    await fs.access(gsdPath);
  } catch {
    return {
      found: false,
      reason: 'GSD not found at default location (~/.claude/)'
    };
  }

  // Phase 2: Validate structure
  const validation = await validateGSDStructure(gsdPath);

  if (!validation.valid) {
    return {
      found: true,
      path: gsdPath,
      valid: false,
      missingFiles: validation.missingFiles,
      missingDirs: validation.missingDirs,
      reason: `Incomplete installation: missing ${[...validation.missingFiles, ...validation.missingDirs].join(', ')}`
    };
  }

  // Phase 3: Check freshness
  const freshness = await checkFreshness(gsdPath);

  return {
    found: true,
    path: gsdPath,
    valid: true,
    fresh: freshness.status === 'fresh',
    daysOld: freshness.daysAgo ?? undefined,
    missingFiles: [],
    missingDirs: []
  };
}
