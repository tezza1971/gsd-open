import { promises as fs } from 'node:fs/promises';
import { paths } from '../../lib/paths.js';
import type { GSDDetectionResult } from '../../types/index.js';

export async function detectGSD(): Promise<GSDDetectionResult> {
  const gsdPath = paths.gsdDir();

  try {
    await fs.access(gsdPath);
  } catch {
    return {
      found: false,
      path: undefined,
      valid: false,
      reason: 'GSD not found at expected path'
    };
  }

  return await validateGSDStructure(gsdPath);
}

async function validateGSDStructure(gsdPath: string): Promise<GSDDetectionResult> {
  const missingFiles: string[] = [];
  const missingDirs: string[] = [];

  // Check required files
  const requiredFiles = ['package.json', 'README.md'];
  for (const file of requiredFiles) {
    const filePath = `${gsdPath}/${file}`;
    try {
      await fs.access(filePath);
    } catch {
      missingFiles.push(file);
    }
  }

  // Check required directories
  const requiredDirs = ['commands', 'agents'];
  for (const dir of requiredDirs) {
    const dirPath = `${gsdPath}/${dir}`;
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        missingDirs.push(dir);
      }
    } catch {
      missingDirs.push(dir);
    }
  }

  const valid = missingFiles.length === 0 && missingDirs.length === 0;

  return {
    found: true,
    path: gsdPath,
    valid,
    missingFiles,
    missingDirs
  };
}

export { detectGSD };