# GSD Open (gsdo) - Project Specification

## What This Is

A **frictionless, idiot-proof** installer that migrates GSD context engineering from Claude Code to OpenCode. Run one command, get your `/gsd-*` commands in OpenCode, done. No precision, no guarantees, just best-effort migration that gets you 80% of the way there.

## Core Philosophy

1. **Installer-only** - No interactive CLI, just run `npx gsd-open` and it does everything
2. **Algorithmic + LLM** - Installer does deterministic transpile, `/gsdo` command in OpenCode does LLM-based enhancement
3. **Best effort** - Not a 1:1 replacement, not perfect parity, just good enough to be useful
4. **Frictionless** - Zero user input, automatic detection, smart defaults
5. **OpenCode-native enhancement** - Use OpenCode's LLM, not separate API keys

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  npx gsd-open (Installer Script)                            │
│  ─────────────────────────────────────────────────────────  │
│  1. Check if GSD changed (version/timestamps)               │
│  2. Download/cache OpenCode docs (~/.gsdo/cache/)          │
│  3. Install /gsdo command in OpenCode                       │
│  4. Algorithmically transpile /gsd:* commands               │
│  5. Write exit log (~/.gsdo/install.log)                    │
│  6. Show ASCII success screen                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  /gsdo (OpenCode Command)                                    │
│  ─────────────────────────────────────────────────────────  │
│  1. Read install.log for context                            │
│  2. Analyze transpiled /gsd-* commands                      │
│  3. Use OpenCode's LLM to enhance/fix/adapt                 │
│  4. Update commands in place                                │
│  5. Write summary to install.log                            │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
~/.gsdo/                              # All gsdo state
├── last-imported-gsd                 # Version/timestamp of last import
├── install.log                       # Exit log from installer + /gsdo runs
└── cache/
    └── docs-opencode/               # OpenCode docs cache (24hr TTL)
        └── opencode-docs.cache      # Cached schema documentation

~/.claude/get-shit-done/             # GSD source (Claude Code)
├── skills/                          # /gsd:* commands to transpile
├── workflows/
├── templates/
└── config/

~/.config/opencode/                  # OpenCode destination
├── commands.json                    # Transpiled /gsd-* commands + /gsdo
├── agents.json                      # If needed
└── ...
```

## Installer Flow (npx gsd-open)

### Step 1: Idempotency Check

**Goal:** Don't re-transpile if GSD source hasn't changed

**Implementation:**
- Read `~/.gsdo/last-imported-gsd` file
- Compare version number OR file timestamps
- If unchanged, show "Already up to date" and exit
- If changed or missing, proceed

**File format (`last-imported-gsd`):**
```
version: 1.2.3
timestamp: 2026-01-22T08:00:00Z
source: ~/.claude/get-shit-done/
```

### Step 2: Cache OpenCode Documentation

**Goal:** Download/refresh OpenCode docs for `/gsdo` command to use

**Implementation:**
- Check `~/.gsdo/cache/docs-opencode/opencode-docs.cache`
- If missing or older than 24 hours, fetch from GitHub
- URL: `https://raw.githubusercontent.com/sst/opencode/main/docs/schema.md`
- Store with current timestamp

**Cache file format:**
```
{
  "fetched": "2026-01-22T08:00:00Z",
  "content": "... markdown content ..."
}
```

### Step 3: Install /gsdo Command

**Goal:** Add the `/gsdo` enhancement command to OpenCode

**Implementation:**
- Detect OpenCode config directory (`.opencode/`, `~/.config/opencode/`, `%APPDATA%/opencode/`)
- Read existing `commands.json` (if exists)
- Add/update `/gsdo` command definition
- Write back to `commands.json`

**Command definition:**
```json
{
  "name": "gsdo",
  "description": "Enhance transpiled GSD commands using LLM analysis",
  "promptTemplate": "You are enhancing transpiled GSD commands for OpenCode.\n\n**Context:**\n- Install log: {{installLog}}\n- OpenCode docs: {{opencodeDocsPath}}\n- Transpiled commands: {{commandsList}}\n\n**Task:**\nAnalyze the transpiled /gsd-* commands and enhance them:\n1. Fix naming (colon to dash conversions)\n2. Improve prompt templates for OpenCode\n3. Add missing parameters\n4. Fix broken references\n5. Update in place\n\n**Output:**\nProvide a summary of changes made to {{installLog}}",
  "config": {
    "installLog": "~/.gsdo/install.log",
    "opencodeDocsPath": "~/.gsdo/cache/docs-opencode/opencode-docs.cache"
  }
}
```

### Step 4: Algorithmic Transpilation

**Goal:** Deterministically convert `/gsd:*` commands to `/gsd-*` format

**Source:** `~/.claude/get-shit-done/skills/gsd:*.md`

**Transformations:**
1. **Name conversion:** `/gsd:plan-phase` → `/gsd-plan-phase`
2. **Extract prompt template** from markdown
3. **Parse parameters** from template variables
4. **Basic field mapping:**
   - `name` → `name` (with colon→dash)
   - `description` → `description`
   - `template` → `promptTemplate`
   - `agent` → `config.agent` (if present)

**No complex logic** - just pattern matching and string replacement. Leave the smart stuff to `/gsdo`.

**Output:** Array of OpenCode command objects

**Verbose output during transpilation:**
```
→ Detecting GSD installation...
  ✓ Found at ~/.claude/get-shit-done/
→ Scanning for /gsd:* commands...
  ✓ Found 15 commands
→ Transpiling commands...
  ✓ gsd:plan-phase → gsd-plan-phase
  ✓ gsd:execute-phase → gsd-execute-phase
  ⚠ gsd:debug → gsd-debug (parameter mismatch)
  ...
→ Writing to OpenCode...
  ✓ ~/.config/opencode/commands.json updated
```

### Step 5: Write Exit Log

**Goal:** Record what happened for `/gsdo` command to read

**Location:** `~/.gsdo/install.log`

**Format:**
```markdown
# GSD Open Install Log
Date: 2026-01-22T08:00:00Z
Source: ~/.claude/get-shit-done/ (version 1.2.3)
Target: ~/.config/opencode/

## Commands Transpiled
- ✓ gsd:plan-phase → gsd-plan-phase
- ✓ gsd:execute-phase → gsd-execute-phase
- ⚠ gsd:debug → gsd-debug (parameter mismatch in template)
- ✗ gsd:custom-skill → failed (invalid syntax)

## Warnings
- 3 commands have parameter mismatches
- 2 commands reference unavailable agents
- 1 command uses unsupported features

## Next Steps
Run `/gsdo` in OpenCode to enhance these commands using LLM analysis.

---
## Enhancement Log (from /gsdo command)
[This section written by /gsdo command after it runs]
```

### Step 6: Show Success Screen

**Goal:** Nice ASCII art + clear next steps

**Output:**
```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║            GSD Open - Installation Complete         ║
║                                                      ║
╚══════════════════════════════════════════════════════╝

✓ Installed /gsdo command in OpenCode
✓ Transpiled 15 GSD commands (12 success, 3 warnings)
✓ Cached OpenCode documentation
✓ Install log: ~/.gsdo/install.log

⚠️  DISCLAIMER
This is a BEST EFFORT migration, not perfect parity with Claude Code GSD.
Some commands may need manual adjustment. Expect rough edges.

📋 NEXT STEPS
1. Open OpenCode
2. Run: /gsdo
3. Let the LLM enhance your commands

💡 TIP
Run 'npx gsd-open' again anytime to update after changing GSD source.
```

## /gsdo Command (OpenCode)

### Purpose
Use OpenCode's configured LLM to enhance the algorithmically transpiled commands.

### Execution Flow

1. **Read Context**
   - Read `~/.gsdo/install.log` for transpilation results
   - Read `~/.gsdo/cache/docs-opencode/` for OpenCode schema
   - List all `/gsd-*` commands in OpenCode's `commands.json`

2. **Analyze & Enhance**
   - Use LLM to analyze each command
   - Fix naming issues (any remaining colon→dash missed conversions)
   - Improve prompt templates for OpenCode's style
   - Add missing parameters
   - Fix broken agent references
   - Adapt GSD-specific syntax to OpenCode equivalents

3. **Update In Place**
   - Modify `commands.json` directly
   - No backups, no rollback (user can re-run installer to reset)

4. **Write Summary**
   - Append enhancement results to `~/.gsdo/install.log`
   - Show success/failure summary to user

### Example Enhancement

**Before (algorithmic transpile):**
```json
{
  "name": "gsd-plan-phase",
  "description": "Plan phase implementation",
  "promptTemplate": "Create plan for {{phase}} using {{context}}"
}
```

**After (/gsdo enhancement):**
```json
{
  "name": "gsd-plan-phase",
  "description": "Create detailed execution plan for a GSD phase with task breakdown and verification",
  "promptTemplate": "You are planning a GSD phase implementation.\n\nPhase: {{phase}}\nContext: {{context}}\n\nCreate a detailed plan with:\n1. Task breakdown with dependencies\n2. Success criteria\n3. Verification steps\n4. Risk analysis\n\nOutput format: Structured markdown with task list."
}
```

### Output Format

**Summary shown to user:**
```
✓ Enhanced 12 commands
⚠ 3 commands need manual review
✗ 1 command failed enhancement

Details written to ~/.gsdo/install.log
```

**Appended to install.log:**
```markdown
---
## Enhancement Log
Date: 2026-01-22T08:15:00Z
LLM: Claude Sonnet 4.5 (via OpenCode)

### Enhanced Commands
- ✓ gsd-plan-phase: Improved prompt template, added structured output format
- ✓ gsd-execute-phase: Fixed agent reference, enhanced error handling
- ⚠ gsd-debug: Needs manual review - complex conditional logic
- ✗ gsd-custom-skill: Failed - syntax too different from OpenCode model

### Recommendations
1. Test gsd-plan-phase and gsd-execute-phase first
2. Manually review gsd-debug for conditional logic handling
3. Consider rewriting gsd-custom-skill from scratch
```

## State Files

### ~/.gsdo/last-imported-gsd

**Purpose:** Track GSD source version for idempotency

**Format:**
```
version: 1.2.3
timestamp: 2026-01-22T08:00:00Z
source: ~/.claude/get-shit-done/
```

**Updated:** Every successful installer run

### ~/.gsdo/install.log

**Purpose:** Record installer + enhancement results for context

**Format:** Markdown (human + LLM readable)

**Sections:**
1. Install metadata (date, source, target)
2. Transpilation results (success/warnings/errors)
3. Enhancement log (appended by `/gsdo`)

**Updated:**
- Installer: Overwrites entire file
- `/gsdo`: Appends to "Enhancement Log" section

### ~/.gsdo/cache/docs-opencode/opencode-docs.cache

**Purpose:** Cache OpenCode schema docs for `/gsdo` to reference

**Format:** JSON with timestamp
```json
{
  "fetched": "2026-01-22T08:00:00Z",
  "ttl": 86400,
  "content": "... markdown content from GitHub ..."
}
```

**TTL:** 24 hours

**Updated:** Installer checks age and refetches if stale

## Requirements

### Functional Requirements

**FR-1: Idempotency**
- Installer must not re-transpile if GSD source unchanged
- Check version number or file timestamps
- Store last import metadata in `~/.gsdo/last-imported-gsd`

**FR-2: GSD Detection**
- Auto-detect GSD at `~/.claude/get-shit-done/`
- Exit with clear error if not found
- No user prompts for location

**FR-3: OpenCode Detection**
- Auto-detect OpenCode config directory
- Check in order: `.opencode/`, `~/.config/opencode/`, `%APPDATA%/opencode/`
- Create directory if doesn't exist

**FR-4: Algorithmic Transpilation**
- Convert `/gsd:*` → `/gsd-*` (colon to dash)
- Extract prompt templates from markdown
- Parse template variables
- Map to OpenCode command schema
- No complex logic, just pattern matching

**FR-5: Documentation Caching**
- Download OpenCode docs from GitHub
- Cache in `~/.gsdo/cache/docs-opencode/`
- 24-hour TTL
- Refetch if stale or missing

**FR-6: /gsdo Command Installation**
- Install single `/gsdo` enhancement command
- Include references to install.log and docs cache
- Update existing commands.json without breaking other commands

**FR-7: Exit Logging**
- Write detailed log to `~/.gsdo/install.log`
- Include transpilation results
- Include warnings and errors
- Markdown format for LLM readability

**FR-8: Success Screen**
- ASCII art header
- Summary of what was done
- Disclaimer about best effort
- Clear next steps
- Tip about re-running

**FR-9: /gsdo Enhancement**
- Read install.log and OpenCode docs cache
- Use OpenCode's LLM to enhance commands
- Update commands.json in place
- Append results to install.log
- Show summary to user

**FR-10: Zero User Input**
- Completely automated, no prompts
- Smart defaults for everything
- Exit with errors, don't hang waiting for input

### Non-Functional Requirements

**NFR-1: Performance**
- Complete installation in < 10 seconds
- Cache docs to avoid repeated downloads
- Don't re-transpile if source unchanged

**NFR-2: Simplicity**
- Single script, minimal dependencies
- No CLI framework needed
- Just Node.js + built-in modules

**NFR-3: Reliability**
- Graceful error handling
- Clear error messages
- Don't leave partial state

**NFR-4: Maintainability**
- Simple, readable code
- No over-engineering
- Inline documentation

**NFR-5: Cross-Platform**
- Works on Windows, Mac, Linux
- Handle path differences automatically
- Use Node.js path module

## Out of Scope

### NOT Included

1. **Interactive CLI** - No prompts, no user input
2. **Perfect parity** - Not trying to match Claude Code GSD exactly
3. **Backups** - No rollback, no safety nets (user can re-run installer)
4. **Manifests** - No complex state tracking
5. **API key management** - Use OpenCode's LLM, not separate APIs
6. **LLM in installer** - Only algorithmic transpile, LLM only in `/gsdo`
7. **Multiple platforms** - OpenCode only (no Antigravity, Cursor, etc.)
8. **GSD updates** - User updates GSD via Claude Code, we just transpile
9. **Conflict resolution** - Overwrite existing commands, no merging
10. **Validation** - Best effort, no schema validation

## Tech Stack

### Runtime
- Node.js 20+
- Built-in modules only (fs, path, os, https)
- No external dependencies for installer

### Distribution
- npm package (`gsd-open`)
- Executable via `npx gsd-open`
- Single entry point script

### File Formats
- JSON for configuration
- Markdown for logs (human + LLM readable)
- Plain text for version tracking

## User Journey

### First-Time Setup

1. User has GSD installed in Claude Code
2. User runs `npx gsd-open`
3. Installer:
   - Detects GSD
   - Caches docs
   - Installs `/gsdo` command
   - Transpiles all `/gsd:*` commands
   - Shows success screen
4. User opens OpenCode
5. User runs `/gsdo`
6. LLM enhances commands in place
7. User tries commands, iterates if needed

### Subsequent Updates

1. User updates GSD in Claude Code (new version/changes)
2. User runs `npx gsd-open` again
3. Installer detects changes, re-transpiles
4. User runs `/gsdo` again to re-enhance
5. Done

### Daily Use

User just uses `/gsd-*` commands in OpenCode. No interaction with gsdo needed unless updating GSD source.

## Success Criteria

1. **Frictionless:** Zero user input, works first try
2. **Fast:** < 10 seconds end-to-end
3. **Useful:** 80% of GSD commands work well enough
4. **Clear:** User knows exactly what happened and what to do next
5. **Resilient:** Clear errors, doesn't corrupt existing OpenCode config
6. **Idempotent:** Can run multiple times without issues

## Messaging & Disclaimers

### Installer Disclaimer
```
⚠️  DISCLAIMER
This is a BEST EFFORT migration, not perfect parity with Claude Code GSD.
Some commands may need manual adjustment. Expect rough edges.
```

### Documentation Tone
- Clear and direct
- No marketing fluff
- Honest about limitations
- Practical guidance over theory

### Error Messages
- Specific and actionable
- Include file paths
- Suggest fixes when possible
- No vague errors

## Examples

### Example: Successful First Run

**Terminal output:**
```bash
$ npx gsd-open

→ Detecting GSD installation...
  ✓ Found at ~/.claude/get-shit-done/
→ Checking for updates...
  ℹ First run, no previous import
→ Caching OpenCode documentation...
  ✓ Downloaded from GitHub
→ Installing /gsdo command...
  ✓ Added to ~/.config/opencode/commands.json
→ Scanning for /gsd:* commands...
  ✓ Found 15 commands
→ Transpiling commands...
  ✓ gsd:plan-phase → gsd-plan-phase
  ✓ gsd:execute-phase → gsd-execute-phase
  ✓ gsd:verify-work → gsd-verify-work
  ⚠ gsd:debug → gsd-debug (parameter mismatch)
  ... (11 more)
→ Writing to OpenCode...
  ✓ ~/.config/opencode/commands.json updated

╔══════════════════════════════════════════════════════╗
║                                                      ║
║            GSD Open - Installation Complete         ║
║                                                      ║
╚══════════════════════════════════════════════════════╝

✓ Installed /gsdo command in OpenCode
✓ Transpiled 15 GSD commands (14 success, 1 warning)
✓ Cached OpenCode documentation
✓ Install log: ~/.gsdo/install.log

⚠️  DISCLAIMER
This is a BEST EFFORT migration, not perfect parity with Claude Code GSD.
Some commands may need manual adjustment. Expect rough edges.

📋 NEXT STEPS
1. Open OpenCode
2. Run: /gsdo
3. Let the LLM enhance your commands

💡 TIP
Run 'npx gsd-open' again anytime to update after changing GSD source.
```

### Example: Subsequent Run (No Changes)

```bash
$ npx gsd-open

→ Detecting GSD installation...
  ✓ Found at ~/.claude/get-shit-done/
→ Checking for updates...
  ✓ Already up to date (version 1.2.3, imported 2 hours ago)

Nothing to do. Your OpenCode commands are current.

💡 TIP: To force re-transpilation, delete ~/.gsdo/last-imported-gsd
```

### Example: Error - GSD Not Found

```bash
$ npx gsd-open

→ Detecting GSD installation...
  ✗ GSD not found at ~/.claude/get-shit-done/

ERROR: Cannot find GSD installation.

Make sure GSD is installed in Claude Code:
1. Open Claude Code
2. Install GSD from https://github.com/glittercowboy/get-shit-done
3. Run 'npx gsd-open' again

If GSD is installed elsewhere, gsdo does not support custom locations.
```

## Development Phases

### Phase 1: Core Installer
- GSD detection
- OpenCode detection
- Basic transpilation (name conversion only)
- Write to commands.json
- Success screen

### Phase 2: Documentation Cache
- Fetch OpenCode docs
- Cache with TTL
- Include in /gsdo command context

### Phase 3: /gsdo Command
- Command definition with context references
- Install alongside transpiled commands
- Test in OpenCode

### Phase 4: Enhanced Transpilation
- Extract prompt templates from markdown
- Parse template variables
- Map GSD fields to OpenCode schema

### Phase 5: Idempotency
- Version tracking
- Timestamp comparison
- Skip if unchanged

### Phase 6: Exit Logging
- Detailed install.log
- Include warnings/errors
- Enhancement log section

### Phase 7: Polish
- Better error messages
- ASCII art
- Cross-platform testing

## Questions for User

Before implementing, clarify:

1. **GSD Version Detection:** Should we parse version from GSD's package.json or just use file timestamps?

2. **Command Naming:** Keep `/gsd-*` or use different prefix (e.g., `/gsd:*` unchanged, or just `/plan-phase`)?

3. **Partial Failures:** If 10/15 commands transpile successfully, do we:
   - Install the 10 that worked?
   - Or fail entirely and install nothing?

4. **OpenCode Config Format:** Single `opencode.json` or separate files (`commands.json`, `agents.json`)? Which does OpenCode prefer?

5. **Error Recovery:** If `/gsdo` enhancement fails, should commands stay in algorithmic-transpiled state? (I assume yes)

6. **/gsdo Behavior:** Should it enhance ALL commands every time, or only ones that changed? Or does user specify which command to enhance?
