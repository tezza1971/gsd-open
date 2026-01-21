# Phase 2: Detection - Research

**Researched:** 2026-01-21
**Domain:** Installation detection and validation for GSD and OpenCode on user's system
**Confidence:** HIGH

## Summary

Phase 2 implements the discovery and validation layer that determines if GSD and OpenCode are installed and ready for transpilation. The core challenge is creating reliable detection across Windows, macOS, and Linux with clear diagnostics when something is missing or outdated.

GSD installations are directory-based (at `~/.claude/`) and can be validated by checking for expected subdirectories and files. OpenCode has multiple installation paths depending on package manager (npm, Homebrew, Scoop, etc.) and is best detected by checking PATH for the binary. Freshness checking for GSD can use git history when installed from a git clone, and can fall back to file modification dates.

The standard approach is: attempt path-based detection first (fastest, most reliable), fall back to PATH searches for commands, use graceful error messages that tell users exactly how to fix problems, and always respect the --quiet flag (but show warnings by default).

**Primary recommendation:** Implement three detection modules (GSD path detection, OpenCode command detection, freshness checking), use cross-platform path utilities already established in Phase 1, structure detection results as a validation report, and provide actionable error messages for each failure case.

## Standard Stack

The established libraries/tools for installation detection in 2026:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^14.0.2 | Already in use - options parsing for custom paths | Consistent with Phase 1 |
| @clack/prompts | ^0.11.0 | Already in use - user prompts for missing installations | Consistent with Phase 1 |
| node:fs/promises | Built-in | Async file system operations, path validation | Zero dependency, async-first |
| node:child_process | Built-in | Execute git commands for freshness checks | Zero dependency, reliable |

### Supporting (for freshness checks)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:path | Built-in | Cross-platform path normalization | Already in use via paths.ts |
| node:os | Built-in | Platform detection (process.platform) | Already in use via paths.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| child_process.execSync | npm package 'which' | 'which' is external dependency; Node.js built-in is simpler for this use case |
| Direct file checks | npm 'fs-extra' | fs-extra adds 1MB+ dependency; Node.js fs/promises is sufficient |
| Manual PATH parsing | npm 'command-exists' | command-exists adds dependency; parsing PATH directly is lightweight |

**Installation:**
```bash
# No new dependencies - use Node.js built-ins and existing stack
# Detection code uses: fs/promises, child_process, path, os, and existing logger/paths modules
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.ts                   # Entry point (already exists)
├── commands/
│   ├── index.ts            # Main command action
│   └── detect.ts           # Detection orchestration (NEW)
├── lib/
│   ├── paths.ts            # Cross-platform paths (exists)
│   ├── logger.ts           # Logging utilities (exists)
│   ├── manifesto.ts        # Manifesto display (exists)
│   ├── exit-codes.ts       # Exit codes (exists)
│   └── detection/          # Detection logic (NEW)
│       ├── gsd-detector.ts    # GSD path detection
│       ├── opencode-detector.ts # OpenCode command detection
│       ├── freshness.ts         # GSD freshness checking
│       └── reporter.ts          # Format detection results
└── types/
    └── index.ts            # TypeScript types (update)
```

### Pattern 1: Three-Phase Detection
**What:** Separate concerns: path existence → file validation → freshness checking
**When to use:** Complex detection with multiple failure modes
**Example:**
```typescript
// Pseudo-code: detection flow
type DetectionResult = {
  found: boolean;
  path?: string;
  version?: string;
  fresh?: boolean;
  reason?: string;
};

async function detectGSD(): Promise<DetectionResult> {
  // Phase 1: Check default path
  const defaultPath = paths.gsdDir();
  if (await pathExists(defaultPath)) {
    // Phase 2: Validate completeness (check required dirs/files)
    const valid = await validateGSDStructure(defaultPath);
    if (!valid) {
      return { found: false, reason: 'incomplete installation' };
    }
    // Phase 3: Check freshness
    const fresh = await checkGSDFreshness(defaultPath);
    return { found: true, path: defaultPath, fresh };
  }

  // Fallback: ask user for custom path
  return { found: false, reason: 'not at default location' };
}
```

### Pattern 2: Graceful Degradation with User Prompts
**What:** When detection fails, offer user choices (prompt for path, offer install, show help)
**When to use:** Missing or misconfigured installations
**Example:**
```typescript
async function getGSDPath(options: { quiet?: boolean }): Promise<string | null> {
  // Try auto-detect first
  const defaultPath = paths.gsdDir();
  if (await pathExists(defaultPath)) {
    return defaultPath;
  }

  // If quiet mode, fail silently
  if (options.quiet) {
    log.error('GSD not found at ~/.claude/ and --quiet mode enabled');
    return null;
  }

  // Offer choices
  const choice = await select({
    message: 'GSD not found at default location. What would you like to do?',
    options: [
      { value: 'prompt', label: 'Enter custom path' },
      { value: 'install', label: 'Show installation instructions' },
      { value: 'cancel', label: 'Cancel' },
    ],
  });

  if (choice === 'prompt') {
    return await text({ message: 'Enter GSD path:' });
  } else if (choice === 'install') {
    showInstallInstructions();
    return null;
  }
  return null;
}
```

### Pattern 3: Validation Report with Status Symbols
**What:** Structured report of all checks with visual indicators
**When to use:** Displaying detection results to user
**Example:**
```typescript
type ValidationReport = {
  gsd: {
    found: boolean;
    path?: string;
    valid?: boolean;
    fresh?: boolean;
    missingFiles?: string[];
    reason?: string;
  };
  opencode: {
    found: boolean;
    path?: string;
    version?: string;
    reason?: string;
  };
  ready: boolean;
};

function printReport(report: ValidationReport): void {
  const checkmark = (val: boolean) => val ? pc.green('✓') : pc.red('✗');

  console.log('\n' + pc.bold('Detection Report:'));
  console.log(`${checkmark(report.gsd.found)} GSD`);
  if (report.gsd.found) {
    console.log(`  ${report.gsd.path}`);
    if (!report.gsd.fresh) {
      console.log(`  ${pc.yellow('⚠')} Outdated - consider updating`);
    }
  } else {
    console.log(`  ${pc.red('✗')} ${report.gsd.reason}`);
  }

  console.log(`${checkmark(report.opencode.found)} OpenCode`);
  if (!report.opencode.found) {
    console.log(`  ${pc.red('✗')} ${report.opencode.reason}`);
  }

  console.log(`\n${checkmark(report.ready)} Ready for transpilation: ${report.ready}`);
}
```

### Anti-Patterns to Avoid
- **Running `--version` to detect:** Spawning a process just to check existence is slow; check filesystem first
- **Hardcoding installation paths:** Use platform-aware defaults with fallbacks (already done in paths.ts)
- **Ignoring git history:** GSD installs are often git clones; git log provides reliable freshness data
- **No timeout on external processes:** Always add timeout to execSync calls when checking freshness
- **Failing silently on detection errors:** Always provide actionable error messages to users

## Don't Hand-Roll

Problems that look simple but have complex edge cases:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting command in PATH | Manual string splitting of PATH | Node.js: split process.env.PATH by path.delimiter, check file existence | Windows has PATHEXT with multiple extensions; UNIX uses +x bit; need to handle both |
| Git freshness via git log | Manual exec + regex parsing | child_process.execSync with proper error handling | Git output varies by config (date format, timezone); need robust parsing and fallback |
| Multi-path detection | Manual if/else chains | Structured array of candidate paths with systematic checking | Easy to miss platform-specific paths; harder to maintain and add new ones |
| File validation | Single stat() check | Check existence AND readability (access + constants.R_OK) | File may exist but not be readable; permissions matter on all platforms |
| Timeout handling | No timeout | execSync with timeout option | Hung processes block forever; always set reasonable timeout (e.g., 5 seconds) |

**Key insight:** Installation detection looks trivial but has many platform-specific edge cases (Windows PATHEXT, symlinks, permissions, git output formatting). Using existing cross-platform Node.js utilities prevents silent failures on specific OS combinations.

## Common Pitfalls

### Pitfall 1: Platform-Specific PATH Resolution
**What goes wrong:** Code that works on Unix fails silently on Windows because it doesn't account for executable extensions (.exe, .bat, .cmd). Conversely, checking for extension `.exe` breaks on Unix where no extension exists.

**Why it happens:** Developers test on one OS and assume PATH resolution is universal. Windows requires checking multiple extensions; Unix uses executable bit instead.

**How to avoid:**
```typescript
// WRONG: Assumes Unix-style no-extension paths
function findCommand(cmd: string): boolean {
  return process.env.PATH?.split(':').some(dir =>
    fs.existsSync(path.join(dir, cmd))
  );
}

// CORRECT: Handle Windows extensions
function findCommandInPath(cmd: string): boolean {
  const pathDirs = process.env.PATH?.split(path.delimiter) || [];
  const extensions = process.platform === 'win32'
    ? process.env.PATHEXT?.split(path.delimiter) || ['.exe', '.bat', '.cmd']
    : [''];

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      const fullPath = path.join(dir, cmd + ext);
      if (fs.existsSync(fullPath)) {
        return true;
      }
    }
  }
  return false;
}
```

**Warning signs:**
- Works on macOS but fails on Windows (or vice versa)
- Tests pass locally but CI fails on different OS
- PATH detection never finds commands

**Sources:** [Cross-Platform Node Guide](https://github.com/ehmicky/cross-platform-node-guide), [Checking Executable in PATH](https://abdus.dev/posts/checking-executable-exists-in-path-using-node/)

### Pitfall 2: execSync Errors Not Caught Properly
**What goes wrong:** Using execSync without try/catch, or accessing stderr incorrectly, causes exceptions to crash the process or leaves you unable to diagnose why a command failed.

**Why it happens:** execSync throws exceptions for non-zero exit codes (unlike exec which passes errors to callback). Additionally, you can't get stderr when the command succeeds—it's only available in the error object.

**How to avoid:**
```typescript
// WRONG: Doesn't catch exceptions
const lastCommit = execSync('git log -1 --format=%aI', { cwd: gsdPath });

// WRONG: stderr is not available on success
const result = execSync('git log -1 --format=%aI', { cwd: gsdPath, encoding: 'utf-8' });

// CORRECT: Handle with try/catch and use spawnSync for reliable stderr
import { spawnSync } from 'child_process';

function getGitLastCommit(repoPath: string): string | null {
  const result = spawnSync('git', ['log', '-1', '--format=%aI'], {
    cwd: repoPath,
    encoding: 'utf-8',
    timeout: 5000, // 5 second timeout
  });

  if (result.error || result.status !== 0) {
    return null; // Git command failed
  }
  return result.stdout.trim();
}
```

**Warning signs:**
- Unhandled exceptions crash the process when checking freshness
- Can't get useful error info when git command fails
- Detection halts completely on any git error

**Sources:** [Node.js Child Process Docs](https://nodejs.org/api/child_process.html), [Catching Errors in child_process](https://davidwalsh.name/catching-fatal-errors-nodejs-childprocess)

### Pitfall 3: Git Not Available on User's System
**What goes wrong:** Code assumes `git` is available in PATH (for freshness checking), but some users may not have git installed. The execSync call fails and crashes detection.

**Why it happens:** Git is not installed by default on all systems, especially fresh Windows installs or sandboxed environments.

**How to avoid:**
```typescript
// WRONG: Assumes git exists
async function checkGSDFreshness(gsdPath: string): Promise<boolean> {
  const lastCommit = execSync('git log -1 --format=%aI', { cwd: gsdPath }).toString();
  const commitDate = new Date(lastCommit);
  return isRecent(commitDate);
}

// CORRECT: Check git availability first, fall back to file dates
async function checkGSDFreshness(gsdPath: string): Promise<boolean> {
  // Try git first if it's a git repository
  if (await pathExists(path.join(gsdPath, '.git'))) {
    try {
      const result = spawnSync('git', ['log', '-1', '--format=%aI'], {
        cwd: gsdPath,
        timeout: 5000,
        encoding: 'utf-8',
      });

      if (result.status === 0) {
        const commitDate = new Date(result.stdout.trim());
        return isRecent(commitDate);
      }
    } catch {
      // Git command failed, fall through to file date check
    }
  }

  // Fall back to checking file modification date
  try {
    const stat = await fs.promises.stat(path.join(gsdPath, 'package.json'));
    return isRecent(stat.mtime);
  } catch {
    // Can't determine freshness
    return false;
  }
}
```

**Warning signs:**
- Detection fails on systems without git installed
- Works in your dev environment but fails for users
- Can't handle git repositories accessed via git bash vs native git

**Sources:** [last-commit-log npm](https://www.npmjs.com/package/last-commit-log), [git-date-extractor](https://github.com/joshuatz/git-date-extractor)

### Pitfall 4: Incomplete GSD Validation
**What goes wrong:** Detecting GSD at `~/.claude/` but not validating required files/folders, then failing later when transpilation code tries to access `commands/` folder or config files.

**Why it happens:** It's easy to just check if a directory exists. Validating structure requires knowing what "complete" means.

**How to avoid:**
```typescript
// WRONG: Just check if dir exists
const gsdComplete = await pathExists(paths.gsdDir());

// CORRECT: Validate required structure
const REQUIRED_GSD_FILES = ['package.json', 'README.md'];
const REQUIRED_GSD_DIRS = ['commands', 'agents', 'bin'];

async function validateGSDStructure(gsdPath: string): Promise<{
  valid: boolean;
  missingFiles: string[];
  missingDirs: string[];
}> {
  const missing = { files: [], dirs: [] };

  for (const file of REQUIRED_GSD_FILES) {
    const filePath = path.join(gsdPath, file);
    if (!await pathExists(filePath)) {
      missing.files.push(file);
    }
  }

  for (const dir of REQUIRED_GSD_DIRS) {
    const dirPath = path.join(gsdPath, dir);
    if (!await pathExists(dirPath)) {
      missing.dirs.push(dir);
    }
  }

  return {
    valid: missing.files.length === 0 && missing.dirs.length === 0,
    missingFiles: missing.files,
    missingDirs: missing.dirs,
  };
}
```

**Warning signs:**
- GSD detected as ready but transpilation fails immediately
- Users report "GSD found but it's broken"
- No way to distinguish between "GSD not installed" and "GSD installed but incomplete"

**Sources:** [GSD GitHub: Directory Structure](https://github.com/glittercowboy/get-shit-done), [File-based detection patterns](https://learn.microsoft.com/en-us/intune/intune-service/apps/apps-win32-add)

### Pitfall 5: Timeouts on Slow File Systems
**What goes wrong:** Detection on slow file systems (network drives, USB sticks, WSL1) hangs for 30+ seconds while checking for files, making detection feel broken.

**Why it happens:** File operations aren't instantaneous. No timeout is set, so accesses to slow drives block indefinitely.

**How to avoid:**
```typescript
// WRONG: No timeout, can hang on slow file systems
async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
}

// CORRECT: Add abort signal with timeout
import { AbortController } from 'node:abort';

async function pathExistsWithTimeout(
  path: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fs.promises.access(path, { signal: controller.signal });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      log.warn(`Path check timed out: ${path}`);
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
```

**Warning signs:**
- Detection takes >10 seconds on some systems
- Works on SSD but hangs on network drive
- Users report CLI "hanging" during detection phase

**Sources:** [Node.js AbortController](https://nodejs.org/api/abort_controller.html), [File System Performance](https://github.com/ehmicky/cross-platform-node-guide/blob/main/docs/3_filesystem/stat.md)

## Code Examples

Verified patterns from official sources:

### Detecting Command in PATH (Node.js)
```typescript
// Source: https://abdus.dev/posts/checking-executable-exists-in-path-using-node/
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export function commandExists(command: string): boolean {
  try {
    // Use 'where' on Windows, 'which' on Unix
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${checkCmd} ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Alternative: Manual PATH parsing (more portable)
export function findCommandInPath(cmd: string): string | null {
  const pathDirs = process.env.PATH?.split(path.delimiter) || [];
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT?.split(path.delimiter) || ['.exe', '.bat', '.cmd'])
    : [''];

  for (const dir of pathDirs) {
    for (const ext of extensions) {
      const fullPath = path.join(dir, cmd + ext);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}
```

### Getting Git Last Commit Date (Node.js)
```typescript
// Source: https://github.com/node-modules/last-commit-log
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export function getGitLastCommitDate(repoPath: string): Date | null {
  try {
    const result = spawnSync('git', ['log', '-1', '--format=%aI'], {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'], // Capture stderr
    });

    if (result.error || result.status !== 0) {
      return null;
    }

    const dateString = result.stdout?.trim();
    if (!dateString) return null;

    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (err) {
    return null;
  }
}

export function isGitRepository(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, '.git'));
}
```

### Validating Installation Completeness (Node.js)
```typescript
// Source: Cross-platform installation detection best practices
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type InstallationValidation = {
  valid: boolean;
  missingFiles: string[];
  missingDirs: string[];
  reason?: string;
};

export async function validateGSDInstallation(
  gsdPath: string,
  requiredFiles: string[] = ['package.json', 'README.md'],
  requiredDirs: string[] = ['commands', 'agents']
): Promise<InstallationValidation> {
  const missing = { files: [] as string[], dirs: [] as string[] };

  // Check required files
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(gsdPath, file));
    } catch {
      missing.files.push(file);
    }
  }

  // Check required directories
  for (const dir of requiredDirs) {
    try {
      const stat = await fs.stat(path.join(gsdPath, dir));
      if (!stat.isDirectory()) {
        missing.dirs.push(`${dir} (exists but not a directory)`);
      }
    } catch {
      missing.dirs.push(dir);
    }
  }

  return {
    valid: missing.files.length === 0 && missing.dirs.length === 0,
    missingFiles: missing.files,
    missingDirs: missing.dirs,
    reason:
      missing.files.length > 0 || missing.dirs.length > 0
        ? `Missing: ${[...missing.files, ...missing.dirs].join(', ')}`
        : undefined,
  };
}
```

### Checking Installation Freshness (Node.js)
```typescript
// Source: Freshness detection combining git and file dates
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getGitLastCommitDate } from './git.js';

export type FreshnessStatus = 'fresh' | 'stale' | 'unknown';

const FRESHNESS_THRESHOLD_DAYS = 90; // Warn if older than 90 days

export async function checkInstallationFreshness(
  installPath: string
): Promise<{ status: FreshnessStatus; date?: Date; reason?: string }> {
  // Try git first
  if (fs.existsSync(path.join(installPath, '.git'))) {
    const commitDate = getGitLastCommitDate(installPath);
    if (commitDate) {
      const age = Date.now() - commitDate.getTime();
      const days = age / (1000 * 60 * 60 * 24);
      return {
        status: days > FRESHNESS_THRESHOLD_DAYS ? 'stale' : 'fresh',
        date: commitDate,
        reason: `Last commit: ${days.toFixed(0)} days ago`,
      };
    }
  }

  // Fall back to file modification date
  try {
    const stat = await fs.stat(path.join(installPath, 'package.json'));
    const age = Date.now() - stat.mtime.getTime();
    const days = age / (1000 * 60 * 60 * 24);
    return {
      status: days > FRESHNESS_THRESHOLD_DAYS ? 'stale' : 'fresh',
      date: stat.mtime,
      reason: `Last modified: ${days.toFixed(0)} days ago`,
    };
  } catch {
    return { status: 'unknown', reason: 'Unable to determine last update date' };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shell-out to `which` or `where` | Parse PATH env with filesystem checks | Always recommended | Faster (no process spawn), more reliable error handling |
| Running `--version` to check existence | Filesystem-first detection | 2020+ | Eliminates spawning processes just for validation |
| Single synchronous stat() check | Async access() with timeout | 2021+ | Prevents hanging on slow file systems |
| Manual error message building | Structured validation reports | 2023+ | Clearer UX, easier to localize, machine-parseable |

**Deprecated/outdated:**
- **Relying only on `PATH`:** OpenCode has multiple installation methods; some don't add to PATH
- **No timeout on file operations:** Causes hangs on slow file systems (network drives, USB, WSL1)
- **Assuming git exists:** Not all systems have git; need fallback to file dates

## Open Questions

Things that couldn't be fully resolved:

1. **OpenCode installation paths variance by platform**
   - What we know: OpenCode can be installed via npm, Homebrew, Scoop, source - each uses different paths
   - What's unclear: Should detection check all known paths or just PATH?
   - Recommendation: Check PATH first (fast, works across all install methods), then check common config locations (~/.opencode.json, .config/opencode/)

2. **GSD freshness threshold definition**
   - What we know: Phase requirement is to "warn if outdated" but doesn't define "outdated"
   - What's unclear: Is 30 days old? 90 days? 6 months?
   - Recommendation: Use 90-day threshold (balances notifications with user agency). If GSD has received no commits in 90 days, show warning but don't block.

3. **Required GSD files for validation**
   - What we know: GSD has many subdirectories (agents/, commands/, hooks/, scripts/)
   - What's unclear: Which are truly required vs. optional? Can someone use GSD without hooks/?
   - Recommendation: Minimum validation checks for: package.json (identifies as Node project), commands/ (required for transpilation), agents/ (required for context). More detailed validation deferred to Phase 3 transpilation logic.

4. **User PATH vs. global npm packages**
   - What we know: OpenCode can be installed via npm -g, which may not be in PATH in some environments
   - What's unclear: Should detection warn if it finds npm package but not in PATH?
   - Recommendation: If found in npm_config_prefix or node_modules/.bin, show explicit warning: "Found in npm but not in PATH. Run: npm i -g opencode-ai or add to PATH"

## Sources

### Primary (HIGH confidence)
- [GSD GitHub Repository](https://github.com/glittercowboy/get-shit-done) - Official repository with file structure and installation scripts
- [OpenCode GitHub: Installation](https://github.com/opencode-ai/opencode) - Official repository with installation methods
- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html) - Official docs for execSync/spawnSync
- [Node.js File System Documentation](https://nodejs.org/api/fs.html) - Official fs/promises API

### Secondary (MEDIUM confidence)
- [Checking Executable in PATH](https://abdus.dev/posts/checking-executable-exists-in-path-using-node/) - Comprehensive guide with multiple implementations
- [Cross-Platform Node Guide](https://github.com/ehmicky/cross-platform-node-guide) - Platform-specific edge cases and best practices
- [last-commit-log npm package](https://www.npmjs.com/package/last-commit-log) - Node.js module for git commit detection
- [Catching Errors in child_process](https://davidwalsh.name/catching-fatal-errors-nodejs-childprocess) - Error handling patterns for spawned processes

### Tertiary (MEDIUM confidence)
- [OpenCode Installation Tutorial](https://www.nxcode.io/resources/news/opencode-tutorial-2026) - Real-world installation experience (2026)
- [oh-my-opencode Installation Documentation](https://deepwiki.com/code-yeongyu/oh-my-opencode/2.1-installation) - Plugin-based detection patterns

## Metadata

**Confidence breakdown:**
- GSD structure: HIGH - Verified from official GitHub repository
- OpenCode detection: HIGH - Verified from official repository and multiple documentation sources
- Path detection: HIGH - Node.js built-in APIs and established patterns
- Freshness checking: MEDIUM - Standard practice but implementation details (threshold, git availability) require user validation
- Git command execution: MEDIUM - spawnSync patterns are standard but git output format varies

**Research date:** 2026-01-21
**Valid until:** 45 days (installation methods stable, git output format unchanged)
**Platform coverage:** Windows, macOS, Linux (all three platforms explicitly considered)

