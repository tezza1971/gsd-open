/**
 * Type definitions for GSD-to-OpenCode transpilation engine
 *
 * Phase 1: Basic algorithmic conversion (no LLM)
 * - Name transformation: /gsd:* -> gsd-*
 * - Field mapping to OpenCode command schema
 */

/**
 * GSD command structure (simplified - extracted from markdown)
 */
export interface GsdCommand {
  /** Command name from filename, e.g., "/gsd:plan-phase" */
  name: string;

  /** Absolute path to .md file */
  filePath: string;

  /** Entire markdown file content */
  rawContent: string;

  /** Extracted from markdown (if present) */
  description?: string;
}

/**
 * OpenCode command schema (Phase 1: basic fields only)
 */
export interface OpenCodeCommand {
  /** Converted name, e.g., "gsd-plan-phase" (no slash, colon->dash) */
  name: string;

  /** From GSD or default description */
  description: string;

  /** Entire markdown content for now (Phase 1) */
  promptTemplate: string;
}

/**
 * Single transpilation result
 */
export interface TranspileResult {
  /** Whether transpilation succeeded */
  success: boolean;

  /** Converted command (only if success=true) */
  command?: OpenCodeCommand;

  /** Error message (only if success=false) */
  error?: string;

  /** Non-fatal warnings */
  warnings?: string[];
}

/**
 * Batch transpilation result
 */
export interface TranspileBatchResult {
  /** Successfully converted commands */
  successful: OpenCodeCommand[];

  /** Failed conversions with error messages */
  failed: Array<{ name: string; error: string }>;

  /** Warnings from all conversions */
  warnings: Array<{ name: string; warning: string }>;
}
