# GSD Open

## What This Is

A frictionless, zero-input installer that migrates GSD context engineering from Claude Code to OpenCode. Run `npx gsd-open`, it transpiles all `/gsd:*` commands algorithmically, installs a `/gsdo` enhancement command, and exits with clear next steps. The `/gsdo` command then uses OpenCode's LLM to enhance transpiled commands autonomously. Not perfect parity, just best-effort migration that gets users 80% of the way there.

## Core Value

The `/gsdo` LLM enhancement makes transpiled commands actually usable. Algorithmic transpilation alone produces working but rough commands—the LLM refinement adapts them to OpenCode's patterns, fixes edge cases, and makes them production-ready.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Installer detects GSD at `~/.claude/get-shit-done/` automatically
- [ ] Installer checks idempotency via timestamps (skip if source unchanged)
- [ ] Installer caches OpenCode documentation (24hr TTL) in `~/.gsdo/cache/`
- [ ] Installer installs `/gsdo` command in OpenCode's commands.json
- [ ] Installer transpiles all `/gsd:*` commands to `/gsd:*` (or `/gsd-*` fallback)
- [ ] Installer writes timestamped exit log to `~/.gsdo/install.log`
- [ ] Installer shows ASCII success screen with disclaimer and next steps
- [ ] `/gsdo` command reads install.log and cached docs for context
- [ ] `/gsdo` command autonomously enhances all transpiled commands using OpenCode's LLM
- [ ] `/gsdo` command writes results to `~/.gsdo/gsdo.log` (timestamped, rotated)
- [ ] Zero user input throughout entire flow (installer + /gsdo)
- [ ] Partial transpilation success is acceptable (install what works, log what doesn't)
- [ ] Cross-platform support (Windows, Mac, Linux)
- [ ] Installation completes in < 10 seconds

### Out of Scope

- **Interactive CLI** — No prompts, no user decisions, fully automated
- **Perfect parity with Claude Code GSD** — 80% good enough, not 1:1 replication
- **Backups and rollback** — User can re-run installer to reset if needed
- **Multiple platform support** — OpenCode only, not Antigravity/Cursor/etc
- **API key management** — Uses OpenCode's configured LLM, no separate keys
- **Complex state tracking** — No manifests, just timestamp-based idempotency
- **Validation and schema checking** — Best effort approach, no strict validation
- **User skill assessment** — Assumes Claude builds, not user
- **GSD updates** — User updates GSD via Claude Code, we just transpile

## Context

### Migration Tool Philosophy

GSD Open is a **migration tool**, not a project management tool. All state lives in `~/.gsdo/`, never pollutes OpenCode's configuration space with metadata files. We only write the transpiled commands to OpenCode's expected locations.

### Two-Pass Architecture

1. **Algorithmic Pass (Installer)**: Deterministic transpilation using pattern matching. Converts command names, extracts templates, maps basic fields. Fast, repeatable, no LLM needed.

2. **Logical Pass (/gsdo Command)**: LLM-based enhancement in OpenCode's context. Adapts prompts, fixes edge cases, improves usability. Uses OpenCode's configured LLM, sees actual usage context.

### Autonomous Operation

Neither the installer nor `/gsdo` command request user input. Smart defaults everywhere. Errors exit with clear messages, don't hang waiting for input. User runs command, sees results, done.

### Log Rotation Strategy

- **install.log**: Timestamped entries, keep past week only
- **gsdo.log**: Timestamped entries, keep past week only
- Automatic cleanup on each run

## Constraints

- **Runtime**: Node.js 20+ required
- **Dependencies**: Zero external dependencies for installer (built-in modules only)
- **GSD Location**: Must be at `~/.claude/get-shit-done/` (no custom locations)
- **OpenCode Detection**: Auto-detects config at `.opencode/`, `~/.config/opencode/`, or `%APPDATA%/opencode/`
- **Performance**: Must complete installation in < 10 seconds
- **Platform**: Must work on Windows, Mac, Linux without platform-specific code
- **Naming**: Preserve `/gsd:` namespace prefix (or `/gsd-` fallback if filesystem limitations)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use timestamps for idempotency (not version parsing) | Simpler, more reliable, works even if GSD has no version file | — Pending |
| Prefer `/gsd:*` naming, fallback to `/gsd-*` | Namespace preservation, but adapt to platform filesystem limits | — Pending |
| Install partial success (10/15 commands) | Better to have working subset than all-or-nothing failure | — Pending |
| /gsdo enhances everything every run | Autonomous, idempotent, user doesn't manage individual commands | — Pending |
| Separate logs (install.log vs gsdo.log) | Clear separation of concerns, easier troubleshooting | — Pending |
| 7-day log rotation | Balances history preservation with disk space | — Pending |
| No backups or rollback | Re-running installer is the recovery mechanism | — Pending |

---
*Last updated: 2026-01-22 after initialization*
