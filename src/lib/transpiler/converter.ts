/**
 * GSD-to-OpenCode Command Converter
 *
 * Algorithmic conversion (no LLM) that transforms GSD commands to OpenCode format.
 * Phase 4: Enhanced with template extraction and variable parsing.
 * Phase 7: Platform-adaptive command naming for filesystem compatibility.
 */

import type {
  GsdCommand,
  OpenCodeCommand,
  TranspileResult,
  TranspileBatchResult,
} from './types.js';
import { extractPromptTemplate } from './template-extractor.js';
import { parseTemplateVariables } from './variable-parser.js';

/**
 * Determines command naming strategy based on platform filesystem limitations.
 *
 * OpenCode stores commands in commands.json, so command names are JSON keys,
 * not filenames. Most platforms can handle colons in JSON keys.
 *
 * Returns 'colon' to preserve /gsd: namespace clarity.
 * Falls back to 'dash' (/gsd-) only if platform truly can't handle colons.
 *
 * @returns Naming strategy: 'colon' or 'dash'
 */
function getPlatformNamingStrategy(): 'colon' | 'dash' {
  // Windows has stricter filesystem limitations
  // Colons in filenames are problematic on Windows
  // But OpenCode commands are JSON keys, not filenames

  // Check if we're on Windows
  if (process.platform === 'win32') {
    // Test if OpenCode config path is on filesystem that restricts colons
    // For simplicity: default to colon (OpenCode should handle it)
    return 'colon';
  }

  // Mac and Linux: prefer colon for namespace clarity
  return 'colon';
}

/**
 * Converts a single GSD command to OpenCode format
 *
 * Name conversion adapts to platform filesystem limitations:
 * - Preferred: /gsd:plan-phase -> /gsd:plan-phase (keep colon)
 * - Fallback: /gsd:plan-phase -> /gsd-plan-phase (replace colon with dash)
 *
 * @param gsd - GSD command to convert
 * @returns Transpilation result with success/error status
 */
export function convertCommand(gsd: GsdCommand): TranspileResult {
  try {
    const namingStrategy = getPlatformNamingStrategy();

    // Convert name based on strategy
    // Remove leading slash, then handle colon based on platform
    const name = namingStrategy === 'colon'
      ? gsd.name.replace(/^\//, '') // Keep colon: /gsd:foo -> gsd:foo
      : gsd.name.replace(/^\//, '').replace(/:/, '-'); // Replace colon: /gsd:foo -> gsd-foo

    // Use description from GSD or generate default
    const description =
      gsd.description || `Transpiled from GSD: ${gsd.name}`;

    // Phase 4: Extract clean prompt template from GSD markdown
    const promptTemplate = extractPromptTemplate(gsd.rawContent);

    // Phase 4: Parse template variables from extracted template
    const variables = parseTemplateVariables(promptTemplate);

    const warnings: string[] = [];

    // Add warning if description was generated (not extracted from markdown)
    if (!gsd.description) {
      warnings.push('No description found in markdown, using generated default');
    }

    // Add warning if extracted template is empty
    if (!promptTemplate || promptTemplate.trim().length === 0) {
      warnings.push('Extracted template is empty - command may not work');
    }

    // Add warning if variables exist but description doesn't mention them
    if (variables.length > 0 && !description.toLowerCase().includes('parameter')) {
      warnings.push(`Template uses ${variables.length} variable(s) but description doesn't mention parameters`);
    }

    const command: OpenCodeCommand = {
      name,
      description,
      promptTemplate,
      variables: variables.length > 0 ? variables : undefined, // Only include if variables exist
    };

    return {
      success: true,
      command,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during conversion',
    };
  }
}

/**
 * Converts multiple GSD commands in batch
 *
 * Processes all commands and separates successful/failed conversions.
 * Collects warnings from all operations.
 *
 * @param commands - Array of GSD commands to convert
 * @returns Batch result with successful/failed/warnings arrays
 */
export function convertBatch(commands: GsdCommand[]): TranspileBatchResult {
  const successful: OpenCodeCommand[] = [];
  const failed: Array<{ name: string; error: string }> = [];
  const warnings: Array<{ name: string; warning: string }> = [];

  for (const command of commands) {
    const result = convertCommand(command);

    if (result.success && result.command) {
      successful.push(result.command);

      // Collect warnings for this command
      if (result.warnings) {
        for (const warning of result.warnings) {
          warnings.push({ name: command.name, warning });
        }
      }
    } else if (result.error) {
      failed.push({ name: command.name, error: result.error });
    }
  }

  return {
    successful,
    failed,
    warnings,
  };
}
