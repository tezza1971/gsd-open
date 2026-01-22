# Requirements: GSD Open

**Defined:** 2026-01-22
**Core Value:** The /gsdo LLM enhancement makes transpiled commands actually usable

## v1 Requirements

### Detection & Validation

- [ ] **DETECT-01**: Installer auto-detects GSD at `~/.claude/get-shit-done/`
- [ ] **DETECT-02**: Installer auto-detects OpenCode config directory (`.opencode/`, `~/.config/opencode/`, `%APPDATA%/opencode/`)
- [ ] **DETECT-03**: Installer exits with clear error if GSD not found
- [ ] **DETECT-04**: Installer exits with clear error if OpenCode not accessible

### Idempotency

- [ ] **IDEM-01**: Installer checks `~/.gsdo/last-imported-gsd` for previous import timestamp
- [ ] **IDEM-02**: Installer skips re-transpilation if GSD source unchanged
- [ ] **IDEM-03**: Installer shows "Already up to date" message when skipping
- [ ] **IDEM-04**: Installer updates `last-imported-gsd` file after successful transpilation

### Documentation Caching

- [ ] **CACHE-01**: Installer downloads OpenCode docs from GitHub on first run
- [ ] **CACHE-02**: Installer caches docs in `~/.gsdo/cache/docs-opencode/` with timestamp
- [ ] **CACHE-03**: Installer checks cache age and refreshes if older than 24 hours
- [ ] **CACHE-04**: Installer handles network failures gracefully when fetching docs

### Command Transpilation

- [ ] **TRANS-01**: Installer scans `~/.claude/get-shit-done/skills/` for `/gsd:*` command files
- [ ] **TRANS-02**: Installer converts command names from `/gsd:*` to `/gsd:*` (or `/gsd-*` if colons unsupported)
- [ ] **TRANS-03**: Installer extracts prompt templates from GSD markdown files
- [ ] **TRANS-04**: Installer parses template variables from prompt templates
- [ ] **TRANS-05**: Installer maps GSD fields to OpenCode command schema
- [ ] **TRANS-06**: Installer handles partial success (installs working commands, logs failures)
- [ ] **TRANS-07**: Installer preserves GSD namespace prefix in command names

### Installation & Output

- [ ] **INSTALL-01**: Installer creates `/gsdo` command definition with context references
- [ ] **INSTALL-02**: Installer reads existing OpenCode `commands.json` if present
- [ ] **INSTALL-03**: Installer adds/updates commands in `commands.json` without breaking existing commands
- [ ] **INSTALL-04**: Installer writes updated `commands.json` to OpenCode config directory
- [ ] **INSTALL-05**: Installer shows verbose progress during transpilation (detection, scanning, writing)

### /gsdo Enhancement

- [ ] **ENHANCE-01**: `/gsdo` command reads `~/.gsdo/install.log` for transpilation context
- [ ] **ENHANCE-02**: `/gsdo` command reads cached OpenCode docs from `~/.gsdo/cache/`
- [ ] **ENHANCE-03**: `/gsdo` command lists all `/gsd-*` commands from OpenCode's `commands.json`
- [ ] **ENHANCE-04**: `/gsdo` command uses OpenCode's configured LLM to analyze and enhance commands
- [ ] **ENHANCE-05**: `/gsdo` command fixes naming issues in transpiled commands
- [ ] **ENHANCE-06**: `/gsdo` command improves prompt templates for OpenCode patterns
- [ ] **ENHANCE-07**: `/gsdo` command adds missing parameters to commands
- [ ] **ENHANCE-08**: `/gsdo` command fixes broken agent/tool references
- [ ] **ENHANCE-09**: `/gsdo` command updates `commands.json` in place
- [ ] **ENHANCE-10**: `/gsdo` command operates autonomously without user input

### Logging

- [ ] **LOG-01**: Installer writes timestamped entries to `~/.gsdo/install.log`
- [ ] **LOG-02**: Installer logs include transpilation results (success/warnings/errors per command)
- [ ] **LOG-03**: `/gsdo` command writes timestamped entries to `~/.gsdo/gsdo.log`
- [ ] **LOG-04**: `/gsdo` command logs include enhancement results per command
- [ ] **LOG-05**: Both logs rotate automatically (keep only past 7 days)
- [ ] **LOG-06**: Logs use markdown format for human and LLM readability

### User Experience

- [ ] **UX-01**: Installer requires zero user input (fully automated)
- [ ] **UX-02**: Installer shows ASCII art success screen after completion
- [ ] **UX-03**: Success screen includes disclaimer about best-effort migration
- [ ] **UX-04**: Success screen shows clear next steps (/gsdo command)
- [ ] **UX-05**: Success screen includes tip about re-running for updates
- [ ] **UX-06**: Error messages are specific and actionable
- [ ] **UX-07**: Partial success transparently shows what worked and what didn't

### Performance

- [ ] **PERF-01**: Installer completes in < 10 seconds for typical GSD installation
- [ ] **PERF-02**: Installer uses caching to avoid redundant work
- [ ] **PERF-03**: Installer skips unnecessary transpilation via idempotency checks

### Cross-Platform Support

- [ ] **PLATFORM-01**: Installer works on Windows, macOS, and Linux
- [ ] **PLATFORM-02**: Installer handles platform-specific path differences automatically
- [ ] **PLATFORM-03**: Installer uses only Node.js built-in modules (no external dependencies)
- [ ] **PLATFORM-04**: Installer adapts command naming based on platform filesystem limitations

## v2 Requirements

(None defined yet - v1 is complete feature set for initial release)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive CLI with prompts | Contradicts zero-input automation philosophy |
| Perfect parity with Claude Code GSD | Best-effort migration (80% target), not 1:1 replication |
| Backup and rollback mechanisms | Re-running installer is the recovery mechanism |
| Complex manifest/state tracking | Simple timestamp-based idempotency sufficient |
| Multiple platform support (Antigravity, Cursor) | OpenCode only for v1 |
| Separate API key management | Uses OpenCode's configured LLM |
| LLM in installer | Algorithmic only, LLM reserved for /gsdo command |
| GSD version management | User updates GSD via Claude Code separately |
| Conflict resolution/merging | Overwrite strategy sufficient |
| Strict schema validation | Best-effort approach, no validation errors |
| Custom GSD installation locations | Standard path only (`~/.claude/get-shit-done/`) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 0
- Unmapped: 42 ⚠️

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after initial definition*
