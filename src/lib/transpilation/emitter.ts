/**
 * OpenCode Configuration Emitter
 *
 * Converts OpenCodeConfig to formatted JSON strings ready for file write.
 * Generates separate files following OpenCode's modular config convention.
 */

import type { OpenCodeConfig, EmitResult } from '../../types/index.js';

/**
 * Sort object keys recursively for deterministic output.
 */
function sortObjectKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as T;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as object).sort();

  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }

  return sorted as T;
}

/**
 * Format object to JSON with sorted keys and 2-space indentation.
 */
function formatJson(data: unknown): string {
  const sorted = sortObjectKeys(data);
  return JSON.stringify(sorted, null, 2);
}

/**
 * Emit OpenCode configuration as formatted JSON files.
 *
 * Generates separate JSON files for each config section following
 * OpenCode's modular configuration convention.
 *
 * @param config - OpenCode configuration structure
 * @returns Emit result with file contents map
 */
export function emitOpenCodeConfig(config: OpenCodeConfig): EmitResult {
  const errors: Array<{ message: string }> = [];
  const files: Record<string, string> = {};

  try {
    // Emit agents.json
    if (config.agents && config.agents.length > 0) {
      files['agents.json'] = formatJson({ agents: config.agents });
    }

    // Emit commands.json
    if (config.commands && config.commands.length > 0) {
      files['commands.json'] = formatJson({ commands: config.commands });
    }

    // Emit models.json
    if (config.models && config.models.length > 0) {
      files['models.json'] = formatJson({ models: config.models });
    }

    // Emit settings.json
    if (config.settings && Object.keys(config.settings).length > 0) {
      files['settings.json'] = formatJson(config.settings);
    }
  } catch (error) {
    errors.push({
      message: `Failed to emit OpenCode config: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return {
    success: errors.length === 0,
    files,
    errors,
  };
}

/**
 * Emit a single consolidated OpenCode configuration file.
 *
 * Alternative to modular files for simpler deployments.
 *
 * @param config - OpenCode configuration structure
 * @returns Emit result with single opencode.json file
 */
export function emitOpenCodeConfigSingle(config: OpenCodeConfig): EmitResult {
  const errors: Array<{ message: string }> = [];
  const files: Record<string, string> = {};

  try {
    files['opencode.json'] = formatJson(config);
  } catch (error) {
    errors.push({
      message: `Failed to emit OpenCode config: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return {
    success: errors.length === 0,
    files,
    errors,
  };
}
