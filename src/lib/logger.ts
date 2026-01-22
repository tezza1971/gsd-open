import pc from 'picocolors';

export enum LogLevel {
  QUIET = 0,
  NORMAL = 1,
  VERBOSE = 2
}

let currentLevel: LogLevel = LogLevel.NORMAL;

export function setLogLevel(verbose: boolean, quiet: boolean): void {
  if (verbose) {
    currentLevel = LogLevel.VERBOSE;
  } else if (quiet) {
    currentLevel = LogLevel.QUIET;
  } else {
    currentLevel = LogLevel.NORMAL;
  }
}

export const log = {
  error: (message: string): void => {
    console.error(pc.red(message));
  },
  warn: (message: string): void => {
    if (currentLevel >= LogLevel.NORMAL) {
      console.warn(pc.yellow(message));
    }
  },
  info: (message: string): void => {
    if (currentLevel >= LogLevel.NORMAL) {
      console.log(message);
    }
  },
  success: (message: string): void => {
    if (currentLevel >= LogLevel.NORMAL) {
      console.log(pc.green(message));
    }
  },
  verbose: (message: string): void => {
    if (currentLevel >= LogLevel.VERBOSE) {
      console.log(pc.dim(message));
    }
  }
};