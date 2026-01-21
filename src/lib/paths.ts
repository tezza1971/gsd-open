import { join } from 'node:path';
import { homedir } from 'node:os';

export const paths = {
  gsdDir: (): string => {
    return join(homedir(), '.claude');
  },

  gsdCommands: (): string => {
    return join(homedir(), '.claude', 'commands');
  },

  openCodeConfig: (): string => {
    const home = homedir();
    if (process.platform === 'win32') {
      return join(home, '.opencode');
    } else {
      return join(home, '.config', 'opencode');
    }
  }
};

export async function pathExists(path: string): Promise<boolean> {
  try {
    const { promises } = await import('fs');
    await promises.access(path);
    return true;
  } catch {
    return false;
  }
}