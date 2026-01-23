/**
 * UI type definitions for progress reporting and success screen
 */

/**
 * Verbosity levels for controlling CLI output detail
 */
export enum VerbosityLevel {
  QUIET = 0,   // Only final result
  NORMAL = 1,  // Default - moderate output
  VERBOSE = 2  // Full detail
}

/**
 * Individual progress step with timing information
 */
export interface ProgressStep {
  name: string;
  startTime: number;
  endTime?: number;
}

/**
 * Data for rendering the success screen after installation
 */
export interface SuccessScreenData {
  commandsInstalled: number;
  gsdPath: string;
  opencodePath: string;
  cacheStatus: 'fresh' | 'stale' | 'unavailable';
  partialSuccess: boolean;
  failedCount?: number;
  warningCount?: number;
}

/**
 * Installation statistics including timing for all steps
 */
export interface InstallationStats {
  totalTime: number;
  steps: ProgressStep[];
}
