/**
 * Enhancement Engine Core
 *
 * Handles context loading and persistence for command enhancement.
 * Writes enhanced commands to individual .md files.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectGsd, detectOpenCode } from '../detector.js';
import { writeCommandFiles } from '../installer/commands-manager.js';
import { getDocsOpenCodeCachePath } from '../cache/paths.js';
import { resolveHome } from '../paths.js';
import type { EnhancementContext } from './types.js';
import type { OpenCodeCommand } from '../transpiler/types.js';

/**
 * Loads all context required for command enhancement.
 * Returns partial context if some files are missing (graceful degradation).
 *
 * @returns Enhancement context with all available data
 * @throws Error only if critical detection fails (OpenCode config path)
 */
export async function loadEnhancementContext(): Promise<EnhancementContext> {
  // Detect installation paths
  const gsdDetection = detectGsd();
  const opencodeDetection = detectOpenCode();

  if (!opencodeDetection.found || !opencodeDetection.path) {
    throw new Error(
      opencodeDetection.error || 'OpenCode config directory not found'
    );
  }

  const opencodeConfigPath = opencodeDetection.path;
  const gsdSkillsPath = gsdDetection.found && gsdDetection.path
    ? join(gsdDetection.path, 'skills')
    : '';

  // Load install.log (graceful: empty string if missing)
  let installLog = '';
  try {
    const installLogPath = resolveHome('~/.gsdo/install.log');
    if (existsSync(installLogPath)) {
      installLog = await readFile(installLogPath, 'utf-8');
    }
  } catch (error) {
    // Silently continue with empty install log
    console.warn('Failed to read install.log:', error);
  }

  // Load cached OpenCode docs (graceful: empty string if missing)
  let opencodeDocsCache = '';
  try {
    const cachePath = getDocsOpenCodeCachePath();
    const readmePath = join(cachePath, 'README.md');
    if (existsSync(readmePath)) {
      opencodeDocsCache = await readFile(readmePath, 'utf-8');
    }
  } catch (error) {
    // Silently continue with empty docs cache
    console.warn('Failed to read OpenCode docs cache:', error);
  }

  return {
    installLog,
    opencodeDocsCache,
    gsdSkillsPath,
    opencodeConfigPath,
    commands: [],
  };
}

/**
 * Writes enhanced commands to individual .md files.
 *
 * @param opencodeConfigPath - Path to OpenCode config directory
 * @param commands - Enhanced commands to persist
 * @throws Error if write fails
 */
export function writeEnhancedCommands(
  opencodeConfigPath: string,
  commands: OpenCodeCommand[]
): void {
  writeCommandFiles(opencodeConfigPath, commands);
}
