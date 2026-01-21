export const ExitCode = {
  SUCCESS: 0,
  WARNING: 1,
  ERROR: 2,
  FATAL: 3
} as const;

export type ExitCodeValue = typeof ExitCode[keyof typeof ExitCode];