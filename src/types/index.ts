export interface CLIOptions {
  verbose: boolean;
  quiet: boolean;
  dryRun: boolean;
}

export interface GSDDetectionResult {
  found: boolean;
  path?: string;
  valid?: boolean;
  fresh?: boolean;
  daysOld?: number;
  missingFiles?: string[];
  missingDirs?: string[];
  reason?: string;
}

export interface OpenCodeDetectionResult {
  found: boolean;
  path?: string;
  reason?: string;
}

/**
 * Aggregated validation report for all detection results.
 * Used by reporter to format and display detection status.
 */
export interface ValidationReport {
  gsd: GSDDetectionResult;
  opencode: OpenCodeDetectionResult;
  ready: boolean;
}